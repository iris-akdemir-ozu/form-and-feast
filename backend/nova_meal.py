import boto3, json

bedrock = boto3.client("bedrock-runtime", region_name="eu-north-1")

def generate_meal(intensity_score: int, protein_needed: int,
                  calories_needed: int, cuisine: str, preferences: str = "") -> dict:

    system_prompt = """You are a sports nutritionist, exercise scientist, and sustainable food expert. STRICT RULES:
    - ONLY recommend whole foods. Never suggest protein bars, protein shakes, or supplements.
    - Always return valid JSON with exactly these fields:
      recipe_name (string),
      ingredients (array of strings like "200g chicken breast"),
      macros (object with protein_g, carbs_g, fat_g, calories as numbers),
      instructions (array of strings),
      drink_pairing (string),
      nutrition_reasoning (string explaining WHY these specific macros were chosen based on the workout intensity - mention the science e.g. glycogen, insulin, muscle protein synthesis),
      ingredient_reasoning (object where each key is an ingredient name and value is a one-sentence science explanation of why it was chosen),
      carbon_footprint_kg (number — estimated total CO2e in kg for this meal, e.g. 1.2),
      carbon_label (string — one of: "Low 🌱", "Medium 🌿", "High 🌍"),
      carbon_reasoning (string — one sentence explaining the main carbon driver of this meal),
      sustainable_swap (object with fields:
        ingredient (string — the highest-carbon ingredient),
        swap (string — the lower-carbon alternative),
        co2_saving_kg (number — estimated CO2e saved by swapping),
        performance_note (string — one sentence on whether the swap affects recovery performance)
      )
    - carbon_footprint_kg benchmarks: beef meals ~3.5-5kg, chicken ~1.0-1.8kg, fish ~0.8-1.5kg, plant-based ~0.3-0.8kg
    - carbon_label: Low if under 1kg, Medium if 1-2.5kg, High if over 2.5kg
    - ingredients MUST be an array of strings, not an object.
    - nutrition_reasoning should be 2-3 sentences explaining the science behind the macro split.
    - Return ONLY the JSON, no extra text."""

    user_prompt = f"""
    Workout intensity: {intensity_score}/10
    Recovery targets: {protein_needed}g protein, {calories_needed} calories
    Cuisine preference: {cuisine}
    Additional preferences: {preferences if preferences else 'none'}

    Generate one specific post-workout meal recipe that hits these targets.
    Also calculate its carbon footprint and suggest a sustainable ingredient swap.
    """

    response = bedrock.invoke_model(
        modelId="amazon.nova-lite-v1:0",
        body=json.dumps({
            "system": [{"text": system_prompt}],
            "messages": [{"role": "user", "content": [{"text": user_prompt}]}]
        })
    )
    result = json.loads(response["body"].read())
    text = result["output"]["message"]["content"][0]["text"]
    text = text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()
    start = text.find("{")
    end = text.rfind("}") + 1
    text = text[start:end]
    print("RAW RESPONSE:", text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        return {
            "recipe_name": "High Protein Recovery Bowl",
            "ingredients": ["200g chicken breast", "1 cup brown rice", "1 cup broccoli", "1 tbsp olive oil"],
            "macros": {"protein_g": 30, "carbs_g": 50, "fat_g": 8, "calories": 500},
            "instructions": ["Cook rice", "Grill chicken", "Steam broccoli", "Combine and serve"],
            "drink_pairing": "Green tea",
            "carbon_footprint_kg": 1.2,
            "carbon_label": "Medium 🌿",
            "carbon_reasoning": "Chicken is the primary carbon driver in this meal.",
            "sustainable_swap": {
                "ingredient": "chicken breast",
                "swap": "firm tofu",
                "co2_saving_kg": 0.6,
                "performance_note": "Tofu provides comparable protein for recovery with slightly lower leucine content."
            }
        }


def chat_with_coach(message: str, context: dict, history: list) -> str:
    cross_session = context.get("cross_session_history", "No previous sessions.")

    session_summary = context.get("session_summary")
    if session_summary:
        session_block = f"""
    - Total Sets This Session: {session_summary.get('total_sets')}
    - Exercises Done: {', '.join(session_summary.get('exercises_done', []))}
    - Average Intensity: {session_summary.get('avg_intensity')}/10
    - Peak Fatigue: {session_summary.get('peak_fatigue')}
    - Muscles Trained: {', '.join(session_summary.get('muscles_trained', []))}
    - Session Injury Flags: {session_summary.get('injury_flags', [])}"""
    else:
        session_block = f"""
    - Exercise: {context.get('exercise_name')}
    - Set Number: {context.get('set_number', '?')}
    - Intensity Score: {context.get('intensity_score')}/10
    - Form Feedback: {', '.join(context.get('form_feedback', []))}
    - Primary Muscles: {', '.join(context.get('primary_muscles', []))}
    - Injury Flags: {context.get('injury_flags', [])}
    - Next Set Objective: {context.get('next_set_objective')}"""

    fatigue_alert = context.get("fatigue_alert", {})
    fatigue_block = (
        f"\n    - ⚠️ FATIGUE ALERT: {fatigue_alert['message']}"
        if fatigue_alert.get("warning") else ""
    )

    meal = context.get('meal', {})
    carbon_block = ""
    if meal.get("carbon_footprint_kg"):
        carbon_block = f"""
    - Meal Carbon Footprint: {meal.get('carbon_footprint_kg')}kg CO2e ({meal.get('carbon_label')})
    - Sustainable Swap: swap {meal.get('sustainable_swap', {}).get('ingredient')} for {meal.get('sustainable_swap', {}).get('swap')} to save {meal.get('sustainable_swap', {}).get('co2_saving_kg')}kg CO2e"""

    system_prompt = f"""You are an expert strength training coach, sports nutritionist, and sustainability advocate.
    You have analyzed the user's workout session and generated their recovery meal.

    ── CURRENT SESSION ──────────────────────────────────────────────────────────{session_block}{fatigue_block}
    - Recovery Meal: {meal.get('recipe_name')}
    - Nutrition Reasoning: {meal.get('nutrition_reasoning')}{carbon_block}

    ── LONGITUDINAL RECOVERY STATUS ─────────────────────────────────────────────
    {context.get('recovery_advisory', 'No recovery data available.')}

    ── TRAINING HISTORY (cross-session RAG memory) ───────────────────────────────
    {cross_session}

    ── RULES ─────────────────────────────────────────────────────────────────────
    - Respond as a knowledgeable, direct coach.
    - Keep responses under 3 sentences unless the question needs more detail.
    - Never suggest supplements.
    - Always reference specific workout context above when relevant.
    - When answering questions about progress, compare against the training history above.
    - If asked about the meal or sustainability, mention the carbon footprint and swap if relevant.
    - If a fatigue alert is active, proactively mention it if the user asks about next sets or weight."""

    messages = []
    for h in history:
        messages.append({"role": h["role"], "content": [{"text": h["content"]}]})
    messages.append({"role": "user", "content": [{"text": message}]})

    response = bedrock.invoke_model(
        modelId="eu.amazon.nova-lite-v1:0",
        body=json.dumps({
            "system": [{"text": system_prompt}],
            "messages": messages
        })
    )
    result = json.loads(response["body"].read())
    return result["output"]["message"]["content"][0]["text"]