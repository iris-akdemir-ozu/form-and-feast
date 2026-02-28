import boto3, json

bedrock = boto3.client("bedrock-runtime", region_name="eu-north-1")

def generate_meal(intensity_score: int, protein_needed: int, 
                  calories_needed: int, cuisine: str, preferences: str = "") -> dict:
    
    system_prompt = """You are a sports nutritionist and exercise scientist. STRICT RULES:
    - ONLY recommend whole foods. Never suggest protein bars, protein shakes, or supplements.
    - Always return valid JSON with exactly these fields:
      recipe_name (string),
      ingredients (array of strings like "200g chicken breast"),
      macros (object with protein_g, carbs_g, fat_g, calories as numbers),
      instructions (array of strings),
      drink_pairing (string),
      nutrition_reasoning (string explaining WHY these specific macros were chosen based on the workout intensity - mention the science e.g. glycogen, insulin, muscle protein synthesis),
      ingredient_reasoning (object where each key is an ingredient name and value is a one-sentence science explanation of why it was chosen)
    - ingredients MUST be an array of strings, not an object.
    - nutrition_reasoning should be 2-3 sentences explaining the science behind the macro split.
    - Return ONLY the JSON, no extra text."""
    user_prompt = f"""
    Workout intensity: {intensity_score}/10
    Recovery targets: {protein_needed}g protein, {calories_needed} calories
    Cuisine preference: {cuisine}
    Additional preferences: {preferences if preferences else 'none'}
    
    Generate one specific post-workout meal recipe that hits these targets.
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
        # If JSON is malformed, return a safe default
        return {
            "recipe_name": "High Protein Recovery Bowl",
            "ingredients": ["200g chicken breast", "1 cup brown rice", "1 cup broccoli", "1 tbsp olive oil"],
            "macros": {"protein_g": 30, "carbs_g": 50, "fat_g": 8, "calories": 500},
            "instructions": ["Cook rice", "Grill chicken", "Steam broccoli", "Combine and serve"],
            "drink_pairing": "Green tea"
        }