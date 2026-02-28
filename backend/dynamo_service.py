import boto3
from datetime import datetime

dynamo = boto3.resource("dynamodb")
table = dynamo.Table("FormAndFeastUsers")

def save_meal_log(user_id: str, meal: dict, intensity_score: int):
    table.put_item(Item={
        "user_id": user_id,
        "timestamp": datetime.utcnow().isoformat(),
        "meal_name": meal["recipe_name"],
        "intensity_score": intensity_score,
        "macros": meal["macros"]
    })

def get_recent_meals(user_id: str) -> list:
    response = table.query(
        KeyConditionExpression="user_id = :uid",
        ExpressionAttributeValues={":uid": user_id},
        Limit=5,
        ScanIndexForward=False  # most recent first
    )
    return [item["meal_name"] for item in response["Items"]]