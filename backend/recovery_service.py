import boto3
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key
import json
import dynamo_service
dynamo = boto3.resource("dynamodb")
sessions_table = dynamo.Table("FormAndFeastSessions")
bedrock = boto3.client("bedrock-runtime", region_name="eu-north-1")

# How many hours each muscle needs to fully recover at 100% intensity
# Based on sports science literature
FULL_RECOVERY_HOURS = {
    "quadriceps":  72,
    "hamstrings":  72,
    "glutes":      60,
    "calves":      48,
    "chest":       60,
    "back_upper":  60,
    "back_lower":  72,
    "shoulders":   48,
    "triceps":     48,
    "biceps":      48,
    "core":        36,
    "hip_flexors": 48,
}

MUSCLE_DISPLAY = {
    "quadriceps":  "Quads",
    "hamstrings":  "Hamstrings",
    "glutes":      "Glutes",
    "calves":      "Calves",
    "chest":       "Chest",
    "back_upper":  "Upper Back",
    "back_lower":  "Lower Back",
    "shoulders":   "Shoulders",
    "triceps":     "Triceps",
    "biceps":      "Biceps",
    "core":        "Core",
    "hip_flexors": "Hip Flexors",
}


def calculate_recovery_status(user_id: str) -> dict:
    """
    For each muscle group, find the last session that trained it,
    then calculate % recovery based on hours elapsed and intensity.

    Formula:
      effective_recovery_hours = full_recovery_hours / (intensity_score / 10)
      recovery_pct = min(100, (hours_elapsed / effective_recovery_hours) * 100)

    Example: Quads trained 36h ago at intensity 8/10
      effective = 72 / 0.8 = 90h needed
      recovery  = min(100, 36/90 * 100) = 40%
    """
    # Pull last 10 sessions to cover all muscle groups
    response = sessions_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id),
        Limit=10,
        ScanIndexForward=False
    )
    sessions = response["Items"]

    if not sessions:
        # No history — all muscles fully recovered
        return {
            muscle: {
                "recovery_pct": 100,
                "status": "ready",
                "last_trained": None,
                "hours_since": None,
                "display_name": MUSCLE_DISPLAY.get(muscle, muscle)
            }
            for muscle in FULL_RECOVERY_HOURS
        }

    now = datetime.now(timezone.utc)
    recovery_status = {}

    for muscle, full_hours in FULL_RECOVERY_HOURS.items():
        # Find most recent session that trained this muscle (activation >= 30)
        last_session = None
        last_activation = 0

        for session in sessions:
            # muscle_activation stored as a dict in DynamoDB
            activation = session.get("muscle_activation", {})
            if isinstance(activation, dict):
                val = int(activation.get(muscle, 0))
            else:
                val = 0

            if val >= 30:
                last_session = session
                last_activation = val
                break  # sessions are sorted newest first

        if not last_session:
            recovery_status[muscle] = {
                "recovery_pct": 100,
                "status": "ready",
                "last_trained": None,
                "hours_since": None,
                "display_name": MUSCLE_DISPLAY.get(muscle, muscle)
            }
            continue

        # Parse timestamp
        ts_str = last_session["timestamp"]
        try:
            last_trained = datetime.fromisoformat(ts_str).replace(tzinfo=timezone.utc)
        except Exception:
            last_trained = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))

        hours_elapsed = (now - last_trained).total_seconds() / 3600

        # Scale recovery hours by intensity — harder session = longer recovery
        intensity = float(last_session.get("avg_intensity", 7))
        intensity_factor = max(0.5, intensity / 10)  # floor at 0.5 to avoid division issues
        effective_hours = full_hours / intensity_factor

        recovery_pct = min(100, round((hours_elapsed / effective_hours) * 100))

        # Status thresholds
        if recovery_pct >= 80:
            status = "ready"
        elif recovery_pct >= 50:
            status = "partial"
        else:
            status = "fatigued"

        recovery_status[muscle] = {
            "recovery_pct":   recovery_pct,
            "status":         status,
            "last_trained":   last_session["timestamp"][:10],  # YYYY-MM-DD
            "hours_since":    round(hours_elapsed, 1),
            "last_intensity": intensity,
            "display_name":   MUSCLE_DISPLAY.get(muscle, muscle)
        }

    return recovery_status


def build_recovery_advisory(recovery_status: dict) -> str:
    """
    Build a natural language advisory string to inject into the coach prompt.
    e.g. 'Hamstrings are at 35% recovery (last trained 2 days ago at intensity 8/10).
          Glutes are at 60% recovery. Quads are fully recovered.'
    """
    fatigued  = [(m, d) for m, d in recovery_status.items() if d["status"] == "fatigued"]
    partial   = [(m, d) for m, d in recovery_status.items() if d["status"] == "partial"]
    ready     = [(m, d) for m, d in recovery_status.items() if d["status"] == "ready" and d["last_trained"]]

    lines = ["Current muscle recovery status:"]

    for muscle, data in fatigued:
        lines.append(
            f"  ⚠️  {data['display_name']}: {data['recovery_pct']}% recovered "
            f"(trained {data['hours_since']}h ago at intensity {data.get('last_intensity', '?')}/10) — NOT RECOMMENDED to train today"
        )
    for muscle, data in partial:
        lines.append(
            f"  🟡 {data['display_name']}: {data['recovery_pct']}% recovered "
            f"(trained {data['hours_since']}h ago) — light work only"
        )
    for muscle, data in ready:
        lines.append(f"  ✅ {data['display_name']}: fully ready")

    if not fatigued and not partial:
        lines.append("  All muscle groups are fully recovered and ready to train.")

    return "\n".join(lines)


def generate_training_recommendation(user_id: str) -> dict:
    """
    Reads the last 3 sessions + current recovery status and calls Nova Lite
    to generate an auto-regulated training recommendation for today.
 
    Returns:
        {
            "recommendation": str,       # main advice paragraph
            "avoid":          list[str],  # muscle groups to avoid today
            "reduce":         list[str],  # muscle groups to reduce volume on
            "ready":          list[str],  # fully recovered, good to train hard
            "intensity_cap":  int,        # suggested max intensity 1-10
        }
    """
    # Get recovery status
    recovery_status  = calculate_recovery_status(user_id)
    recovery_advisory = build_recovery_advisory(recovery_status)
 
    # Get last 3 sessions
    recent_sessions = dynamo_service.get_recent_sessions(user_id, limit=3)
 
    if not recent_sessions:
        return {
            "recommendation": "No training history found. Start your first session — all muscle groups are fully recovered and ready to go!",
            "avoid":         [],
            "reduce":        [],
            "ready":         list(FULL_RECOVERY_HOURS.keys()),
            "intensity_cap": 10,
        }
 
    # Build session history summary for the prompt
    session_summaries = []
    for i, s in enumerate(recent_sessions):
        exercises = s.get("exercises_done", [])
        intensity = s.get("avg_intensity", "?")
        fatigue   = s.get("peak_fatigue", "?")
        flags     = [f.get("issue", "") if isinstance(f, dict) else str(f) for f in s.get("injury_flags", [])]
        muscles   = s.get("muscles_trained", [])
        ts        = s.get("timestamp", "")[:10]
        session_summaries.append(
            f"Session {i+1} ({ts}): exercises={exercises}, avg_intensity={intensity}/10, "
            f"peak_fatigue={fatigue}, muscles_trained={muscles}, injury_flags={flags}"
        )
 
    history_text = "\n".join(session_summaries)
 
    # Fatigued / partial muscles for the prompt
    fatigued = [d["display_name"] for m, d in recovery_status.items() if d["status"] == "fatigued" and d["last_trained"]]
    partial  = [d["display_name"] for m, d in recovery_status.items() if d["status"] == "partial"  and d["last_trained"]]
    ready    = [d["display_name"] for m, d in recovery_status.items() if d["status"] == "ready"    and d["last_trained"]]
 
    system_prompt = """You are an expert strength and conditioning coach with deep knowledge of periodization, 
    auto-regulation, and injury prevention. You analyze an athlete's recent training history and recovery status 
    to give them a precise, science-based training recommendation for today.
    
    Always return valid JSON with exactly these fields:
    {
      "recommendation": string (2-3 sentences, direct coaching advice for today's session),
      "avoid": array of strings (muscle groups to avoid entirely today),
      "reduce": array of strings (muscle groups to train at reduced volume/intensity),
      "ready": array of strings (muscle groups fully recovered and ready for full intensity),
      "intensity_cap": integer 1-10 (maximum recommended training intensity for today),
      "reasoning": string (one sentence explaining the science behind the intensity cap)
    }
    
    Return ONLY the JSON, no extra text."""
 
    user_prompt = f"""
    Athlete's recent training history (newest first):
    {history_text}
    
    Current muscle recovery status:
    {recovery_advisory}
    
    Fatigued muscles (not recommended to train): {fatigued}
    Partially recovered muscles (light work only): {partial}
    Fully recovered muscles (ready for full intensity): {ready}
    
    Based on this data, generate an auto-regulated training recommendation for today.
    Focus on preventing overtraining while maximizing performance on recovered muscle groups.
    """
 
    try:
        response = bedrock.invoke_model(
            modelId="eu.amazon.nova-lite-v1:0",
            body=json.dumps({
                "system":   [{"text": system_prompt}],
                "messages": [{"role": "user", "content": [{"text": user_prompt}]}]
            })
        )
        result = json.loads(response["body"].read())
        text   = result["output"]["message"]["content"][0]["text"].strip()
 
        # Clean JSON fences if present
        if text.startswith("```"):
            text = text.split("```")[1]
            if text.startswith("json"):
                text = text[4:]
        text = text.strip()
        start = text.find("{")
        end   = text.rfind("}") + 1
        text  = text[start:end]
 
        parsed = json.loads(text)
        return parsed
 
    except Exception as e:
        print(f"Training recommendation error: {e}")
        return {
            "recommendation": "Unable to generate recommendation. Check your recent sessions for patterns.",
            "avoid":         fatigued,
            "reduce":        partial,
            "ready":         ready,
            "intensity_cap": 7,
            "reasoning":     "Conservative default due to recent training load."
        }