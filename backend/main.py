from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
import s3_service, nova_form, nova_meal, dynamo_service
import uuid
import recovery_service
import injury_risk
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BUCKET_NAME = "form-and-feast-videos"


# ─── /session/start ───────────────────────────────────────────────────────────
# Call once when user begins a workout. Returns a session_id the frontend
# stores and sends with every subsequent /analyze call.

@app.post("/session/start")
async def start_session(request: Request):
    body = await request.json()
    user_id = body.get("user_id", "user_001")
    session_id = str(uuid.uuid4())
    return {"session_id": session_id, "user_id": user_id}


@app.get("/recovery/status/{user_id}")
async def get_recovery_status(user_id: str):
    status   = recovery_service.calculate_recovery_status(user_id)
    advisory = recovery_service.build_recovery_advisory(status)
    return {
        "recovery_status": status,
        "advisory":        advisory
    }

@app.get("/training/recommendation/{user_id}")
async def get_training_recommendation(user_id: str):
    recommendation = recovery_service.generate_training_recommendation(user_id)
    return recommendation
 

# ─── /analyze ─────────────────────────────────────────────────────────────────
# Now accepts session_id + set_number so each upload is tracked in context.

@app.post("/analyze")
async def analyze(
    video: UploadFile = File(...),
    cuisine: str = Form(...),
    user_id: str = Form(...),
    session_id: str = Form(...),
    set_number: int = Form(1),
    exercise_name: str = Form(""),        
    preferences: str = Form("")
):
    # Step 1: Upload video to S3
    video_bytes = await video.read()
    file_name = f"{session_id}_{uuid.uuid4()}.mp4"
    s3_service.upload_video(video_bytes, BUCKET_NAME, file_name)

    # Step 2: Analyze form with Nova Pro — pass exercise name so Nova focuses correctly
    form_result = nova_form.analyze_workout_video(BUCKET_NAME, file_name, exercise_name)
    exercise_name = form_result.get("exercise_name", "Unknown Exercise")

    # Pull past injury flags for this user to detect recurring patterns
    recent_sessions   = dynamo_service.get_recent_sessions(user_id, limit=5)
    past_injury_flags = [
        flag["issue"]
        for session in recent_sessions
        for flag in session.get("injury_flags", [])
    ]

    # Score injury flags with XAI probability model
    scored_flags = injury_risk.score_injury_flags(
        current_flags=form_result.get("injury_flags", []),
        set_number=set_number,
        intensity_score=form_result.get("intensity_score", 5),
        past_session_flags=past_injury_flags
    )
    form_result["injury_flags"] = scored_flags   # replace raw flags with scored ones



    # Step 3: Save this set to DynamoDB
    dynamo_service.save_set(user_id, session_id, exercise_name, set_number, form_result)

    # Step 4: Fatigue detection — compare against previous sets of same exercise
    previous_sets = dynamo_service.get_sets_for_exercise(user_id, session_id, exercise_name)
    fatigue_alert = dynamo_service.detect_fatigue_trend(previous_sets)

    # Step 5: Generate meal based on THIS set's intensity
    # (will be recalculated properly at session end)
    recent_meals = dynamo_service.get_recent_meals(user_id)
    pref_with_history = (
        preferences + f" Avoid these recent meals: {', '.join(recent_meals)}"
        if recent_meals else preferences
    )
    meal_result = nova_meal.generate_meal(
        intensity_score=form_result["intensity_score"],
        protein_needed=form_result["recovery_protein_g"],
        calories_needed=form_result["recovery_calories"],
        cuisine=cuisine,
        preferences=pref_with_history
    )

    return {
        "exercise_name":     exercise_name,
        "set_number":        set_number,
        "session_id":        session_id,
        "form_feedback":     form_result["form_feedback"],
        "intensity_score":   form_result["intensity_score"],
        "muscle_activation": form_result.get("muscle_activation", {}),
        "recovery_timeline": form_result.get("recovery_timeline", {}),
        "primary_muscles":   form_result.get("primary_muscles", []),
        "secondary_muscles": form_result.get("secondary_muscles", []),
        "estimated_volume":  form_result.get("estimated_volume", "medium"),
        "fatigue_level":     form_result.get("fatigue_level", "medium"),
        "injury_flags":      form_result.get("injury_flags", []),
        "next_set_objective": form_result.get("next_set_objective", ""),
        "fatigue_alert":     fatigue_alert,   # cross-set fatigue warning
        "meal":              meal_result,
    }


# ─── /session/finish ──────────────────────────────────────────────────────────
# Called when user taps "Finish Session". Aggregates all sets, recalculates
# meal on total volume, saves summary for cross-session RAG.

@app.post("/session/finish")
async def finish_session(request: Request):
    body        = await request.json()
    user_id     = body.get("user_id")
    session_id  = body.get("session_id")
    cuisine     = body.get("cuisine", "any")
    preferences = body.get("preferences", "")

    # Pull every set from this session
    all_sets = dynamo_service.get_all_sets_in_session(user_id, session_id)

    if not all_sets:
        return {"error": "No sets found for this session"}

    # Aggregate stats
    exercises_done   = list({s["exercise_name"] for s in all_sets})
    total_sets       = len(all_sets)
    avg_intensity    = round(sum(s["intensity_score"] for s in all_sets) / total_sets, 1)
    all_injury_flags = [f for s in all_sets for f in s.get("injury_flags", [])]

    # Merge muscle activation — take max activation per muscle across all sets
    merged_muscles: dict = defaultdict(int)
    for s in all_sets:
        for muscle, val in s.get("muscle_activation", {}).items():
            merged_muscles[muscle] = max(merged_muscles[muscle], val)

    # Recovery timeline — take max hours per muscle
    merged_recovery: dict = defaultdict(int)
    for s in all_sets:
        for muscle, hours in s.get("recovery_timeline", {}).items():
            merged_recovery[muscle] = max(merged_recovery[muscle], hours)

    muscles_trained = [m for m, v in merged_muscles.items() if v >= 40]

    # Peak fatigue level across all sets
    fatigue_levels = [s.get("fatigue_level", "low") for s in all_sets]
    peak_fatigue = "high" if "high" in fatigue_levels else (
        "medium" if "medium" in fatigue_levels else "low"
    )

    # Scale up calories/protein based on total volume (sets x avg intensity)
    volume_multiplier = min(total_sets / 3, 2.5)   # cap at 2.5x
    base_protein   = all_sets[-1].get("recovery_protein_g", 30)
    base_calories  = all_sets[-1].get("recovery_calories", 500)
    total_protein  = round(base_protein  * volume_multiplier)
    total_calories = round(base_calories * volume_multiplier)

    # Generate session-level meal
    recent_meals = dynamo_service.get_recent_meals(user_id)
    pref_with_history = (
        preferences + f" Avoid these recent meals: {', '.join(recent_meals)}"
        if recent_meals else preferences
    )
    meal_result = nova_meal.generate_meal(
        intensity_score=round(avg_intensity),
        protein_needed=total_protein,
        calories_needed=total_calories,
        cuisine=cuisine,
        preferences=pref_with_history
    )

    all_scored_flags = [
        flag
        for s in all_sets
        for flag in s.get("injury_flags", [])
        if isinstance(flag, dict) and "risk_score" in flag
    ]

    print("ALL SETS:", all_sets)
    print("ALL SCORED FLAGS:", all_scored_flags)
    risk_summary = injury_risk.get_session_risk_summary(all_scored_flags)


    summary = {
        "exercises_done":  exercises_done,
        "total_sets":      total_sets,
        "avg_intensity":   avg_intensity,
        "peak_fatigue":    peak_fatigue,
        "total_volume_kg": 0,
        "muscles_trained": muscles_trained,
        "injury_flags":    all_injury_flags,
        "risk_summary":      risk_summary,
    }

    

    # Save session summary for cross-session RAG
    dynamo_service.save_session_summary(user_id, session_id, summary, meal_result)

    return {
        "session_summary":   summary,
        "muscle_activation": dict(merged_muscles),
        "recovery_timeline": dict(merged_recovery),
        "meal":              meal_result,
        "total_sets":        total_sets,
        "exercises_done":    exercises_done,
    }


# ─── /chat ────────────────────────────────────────────────────────────────────
# Injects cross-session RAG context into the coach system prompt.


@app.post("/chat")
async def chat(request: Request):
    body         = await request.json()
    user_message = body.get("message")
    context      = body.get("context", {})
    history      = body.get("history", [])
    user_id      = body.get("user_id", "user_001")

    # Cross-session RAG memory
    cross_session = dynamo_service.build_cross_session_context(user_id)
    context["cross_session_history"] = cross_session

    # Longitudinal recovery intelligence
    recovery_status  = recovery_service.calculate_recovery_status(user_id)
    recovery_advisory = recovery_service.build_recovery_advisory(recovery_status)
    context["recovery_advisory"] = recovery_advisory

    response = nova_meal.chat_with_coach(
        message=user_message,
        context=context,
        history=history
    )
    return {"reply": response}


















