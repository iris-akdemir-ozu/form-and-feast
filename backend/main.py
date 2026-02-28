from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import s3_service, nova_form, nova_meal, dynamo_service
import uuid

app = FastAPI()

# This allows your React frontend to talk to this backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BUCKET_NAME = "form-and-feast-videos"  # you'll create this in AWS later

@app.post("/analyze")
async def analyze(
    video: UploadFile = File(...),
    cuisine: str = Form(...),
    user_id: str = Form(...),
    preferences: str = Form("")
):
    # Step 1: Upload video to S3
    video_bytes = await video.read()
    file_name = f"{uuid.uuid4()}.mp4"
    s3_service.upload_video(video_bytes, BUCKET_NAME, file_name)

    # Step 2: Analyze form with Nova Pro
    form_result = nova_form.analyze_workout_video(BUCKET_NAME, file_name)

    # Step 3: Generate meal with Nova Lite
    recent = dynamo_service.get_recent_meals(user_id)
    pref_with_history = preferences + f" Avoid these recent meals: {', '.join(recent)}" if recent else preferences
    meal_result = nova_meal.generate_meal(
        intensity_score=form_result["intensity_score"],
        protein_needed=form_result["recovery_protein_g"],
        calories_needed=form_result["recovery_calories"],
        cuisine=cuisine,
        preferences=pref_with_history
    )

    # Step 4: Save to DynamoDB
    dynamo_service.save_meal_log(user_id, meal_result, form_result["intensity_score"])

    return {
        "exercise_name": form_result.get("exercise_name", "Unknown Exercise"),
        "form_feedback": form_result["form_feedback"],
        "intensity_score": form_result["intensity_score"],
        "muscle_activation": form_result.get("muscle_activation", {}),
        "recovery_timeline": form_result.get("recovery_timeline", {}),
        "primary_muscles": form_result.get("primary_muscles", []),
        "secondary_muscles": form_result.get("secondary_muscles", []),
        "estimated_volume": form_result.get("estimated_volume", "medium"),
        "fatigue_level": form_result.get("fatigue_level", "medium"),
        "injury_flags": form_result.get("injury_flags", []),
        "next_set_objective": form_result.get("next_set_objective", ""),
        "meal": meal_result
    }