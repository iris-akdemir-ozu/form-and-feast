import boto3
from datetime import datetime, timezone
from boto3.dynamodb.conditions import Key

dynamo = boto3.resource("dynamodb")
sessions_table = dynamo.Table("FormAndFeastSessions")

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