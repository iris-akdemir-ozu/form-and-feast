import boto3, json

bedrock = boto3.client("bedrock-runtime", region_name="eu-north-1")

def analyze_workout_video(s3_bucket: str, s3_key: str) -> dict:
    prompt = """You are an expert strength training biomechanics coach and physical therapist. Analyze this workout video in detail and return ONLY a JSON object with exactly these fields:
    {
      "exercise_name": "name of the exercise being performed",
      "form_feedback": ["correction 1", "correction 2", "correction 3"],
      "intensity_score": 8,
      "recovery_protein_g": 30,
      "recovery_calories": 500,
      "injury_flags": [
        {
          "issue": "knee valgus detected",
          "severity": "moderate",
          "risk": "increased ACL and meniscus stress",
          "fix": "Focus on pushing knees out in line with toes; try 10% weight reduction next set"
        }
      ],
      "next_set_objective": "Rest 90 seconds. On your next set, focus on driving your knees outward and keeping chest up. Consider reducing weight by 10%.",
      "muscle_activation": {
        "quadriceps": 85,
        "hamstrings": 40,
        "glutes": 70,
        "calves": 20,
        "chest": 0,
        "shoulders": 15,
        "triceps": 10,
        "biceps": 5,
        "back_upper": 30,
        "back_lower": 60,
        "core": 50,
        "hip_flexors": 45
      },
      "recovery_timeline": {
        "quadriceps": 72,
        "hamstrings": 48,
        "glutes": 60,
        "calves": 24,
        "chest": 0,
        "shoulders": 24,
        "triceps": 24,
        "biceps": 24,
        "back_upper": 48,
        "back_lower": 48,
        "core": 24,
        "hip_flexors": 36
      },
      "primary_muscles": ["muscle1", "muscle2"],
      "secondary_muscles": ["muscle3", "muscle4"],
      "estimated_volume": "high/medium/low",
      "fatigue_level": "high/medium/low"
    }
    
    For injury_flags: Look specifically for knee valgus, lumbar rounding, butt wink, forward lean, heel lift, shoulder impingement, elbow flare, hyperextension, cervical strain. If no issues detected, return empty array [].
    severity must be one of: "low", "moderate", "high"
    next_set_objective must be a specific actionable coaching cue for their very next set.
    muscle_activation values are 0-100. recovery_timeline values are hours.
    Only return valid JSON, nothing else."""

    response = bedrock.invoke_model(
        modelId="eu.amazon.nova-pro-v1:0",
        body=json.dumps({
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "video": {
                            "format": "mp4",
                            "source": {
                                "s3Location": {
                                    "uri": f"s3://{s3_bucket}/{s3_key}"
                                }
                            }
                        }
                    },
                    {"text": prompt}
                ]
            }]
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
    print("FORM RAW RESPONSE:", text)
    return json.loads(text)