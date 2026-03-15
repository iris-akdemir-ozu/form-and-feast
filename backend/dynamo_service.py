import boto3
from datetime import datetime
from boto3.dynamodb.conditions import Key
from decimal import Decimal

dynamo = boto3.resource("dynamodb")

# Two tables:
# 1. FormAndFeastSets   → every individual set uploaded in a session
# 2. FormAndFeastSessions → one record per finished session (summary)
sets_table     = dynamo.Table("FormAndFeastSets")
sessions_table = dynamo.Table("FormAndFeastSessions")


# ─── SETS ─────────────────────────────────────────────────────────────────────
def sanitize_for_dynamo(obj):
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: sanitize_for_dynamo(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_dynamo(i) for i in obj]
    return obj


def save_set(user_id: str, session_id: str, exercise_name: str,
             set_number: int, form_result: dict):
    """
    Save one set's worth of form data.
    Primary key:  user_id  (partition)
    Sort key:     session_id#exercise_name#set_number  (range)
    """
    clean = sanitize_for_dynamo(form_result)
    sets_table.put_item(Item={
        "user_id":        user_id,
        "set_key":        f"{session_id}#{exercise_name}#{set_number}",
        "session_id":     session_id,
        "exercise_name":  exercise_name,
        "set_number":     set_number,
        "timestamp":      datetime.utcnow().isoformat(),
       "intensity_score":    clean.get("intensity_score", 0),
        "fatigue_level":      clean.get("fatigue_level", "low"),
        "form_feedback":      clean.get("form_feedback", []),
        "injury_flags":       clean.get("injury_flags", []),
        "muscle_activation":  clean.get("muscle_activation", {}),
        "recovery_timeline":  clean.get("recovery_timeline", {}),
    })


def get_sets_for_exercise(user_id: str, session_id: str,
                          exercise_name: str) -> list:
    """
    Pull all sets for one exercise within the current session.
    Used to detect fatigue accumulation across sets.
    """
    response = sets_table.query(
        KeyConditionExpression=(
            Key("user_id").eq(user_id) &
            Key("set_key").begins_with(f"{session_id}#{exercise_name}#")
        )
    )
    items = sorted(response["Items"], key=lambda x: int(x["set_number"]))
    return items


def get_all_sets_in_session(user_id: str, session_id: str) -> list:
    """Pull every set logged in a session (for end-of-session summary)."""
    response = sets_table.query(
        KeyConditionExpression=(
            Key("user_id").eq(user_id) &
            Key("set_key").begins_with(f"{session_id}#")
        )
    )
    return sorted(response["Items"], key=lambda x: x["timestamp"])


# ─── FATIGUE DETECTION ────────────────────────────────────────────────────────

def detect_fatigue_trend(sets: list) -> dict:
    """
    Compare intensity scores across sets of the same exercise.
    Returns a warning if score drops ≥15 points or injury flags increase.
    """
    if len(sets) < 2:
        return {"warning": False}

    scores = [s["intensity_score"] for s in sets]
    first, last = scores[0], scores[-1]
    drop = first - last

    injury_count_first = len(sets[0].get("injury_flags", []))
    injury_count_last  = len(sets[-1].get("injury_flags", []))

    if drop >= 15 or injury_count_last > injury_count_first:
        return {
            "warning":  True,
            "drop":     drop,
            "message":  (
                f"Fatigue detected on {sets[-1]['exercise_name']}: "
                f"intensity dropped {drop} points over {len(sets)} sets. "
                f"Consider stopping or reducing weight."
            ),
            "severity": "high" if drop >= 25 else "moderate"
        }
    return {"warning": False}


# ─── SESSIONS ─────────────────────────────────────────────────────────────────

def save_session_summary(user_id: str, session_id: str,
                         summary: dict, meal: dict):
    """
    Save end-of-session summary to FormAndFeastSessions.
    Also used for cross-session RAG lookups.
    """
    clean_summary = sanitize_for_dynamo(summary)
    clean_meal    = sanitize_for_dynamo(meal)
    sessions_table.put_item(Item={
        "user_id":           user_id,
        "session_id":        session_id,
        "timestamp":         datetime.utcnow().isoformat(),
        "exercises_done":    clean_summary.get("exercises_done", []),
        "total_sets":        clean_summary.get("total_sets", 0),
        "avg_intensity":     clean_summary.get("avg_intensity", 0),
        "peak_fatigue":      clean_summary.get("peak_fatigue", "low"),
        "total_volume_kg":   clean_summary.get("total_volume_kg", 0),
        "muscles_trained":   clean_summary.get("muscles_trained", []),
        "injury_flags":      clean_summary.get("injury_flags", []),
        "meal_name":         clean_meal.get("recipe_name", ""),
        "meal_macros":       clean_meal.get("macros", {}),
    })


def get_recent_sessions(user_id: str, limit: int = 5) -> list:
    """
    Fetch last N sessions for cross-session RAG context.
    Returns lightweight summaries.
    """
    response = sessions_table.query(
        KeyConditionExpression=Key("user_id").eq(user_id),
        Limit=limit,
        ScanIndexForward=False
    )
    return response["Items"]


def get_recent_meals(user_id: str) -> list:
    """Legacy helper — returns recent meal names to avoid repetition."""
    sessions = get_recent_sessions(user_id, limit=5)
    return [s["meal_name"] for s in sessions if s.get("meal_name")]


# ─── CROSS-SESSION CONTEXT BUILDER ───────────────────────────────────────────

def build_cross_session_context(user_id: str) -> str:
    """
    Build a natural-language summary of past sessions to inject into
    the coach system prompt for cross-session RAG memory.
    """
    sessions = get_recent_sessions(user_id, limit=3)
    if not sessions:
        return "No previous sessions found for this user."

    lines = ["User's recent training history:"]
    for s in sessions:
        date  = s["timestamp"][:10]
        exs   = ", ".join(s.get("exercises_done", []))
        avg_i = s.get("avg_intensity", "?")
        mts   = ", ".join(s.get("muscles_trained", []))
        meal  = s.get("meal_name", "unknown")
        flags = s.get("injury_flags", [])
        flag_str = (
            f" ⚠️ Injury flags: {', '.join([str(f.get('issue', '')) for f in flags if isinstance(f, dict)])}"
            if flags else ""
        )
        lines.append(
            f"- {date}: Trained {exs} | Avg intensity {avg_i}/10 | "
            f"Muscles: {mts} | Meal: {meal}{flag_str}"
        )
    return "\n".join(lines)