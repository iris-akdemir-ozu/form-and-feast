import boto3

s3 = boto3.client("s3", region_name="eu-north-1")

def upload_video(file_bytes: bytes, bucket_name: str, file_name: str) -> str:
    s3.put_object(
        Bucket=bucket_name,
        Key=file_name,
        Body=file_bytes,
        ContentType="video/mp4"
    )
    return file_name