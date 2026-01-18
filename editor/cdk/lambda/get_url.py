import json
import boto3
import os

s3 = boto3.client("s3")
BUCKET = os.environ["BUCKET_NAME"]

def handler(event, context):
    """
    AWS Lambda handler for Kynetic AWS get-url API
    
    :param event: Description
    :param context: Description
    """
    
    query_params = event.get("queryStringParameters")
    if not query_params or "key" not in query_params:
        return {
            "statusCode": 400,
            "body": json.dumps({"error": "Missing query parameter: key"})
        }
    key = query_params["key"]

    url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": key},
        ExpiresIn=300
    )

    return {
        "statusCode": 200,
        "headers": {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
            "Access-Control-Allow-Methods": "GET,OPTIONS"
        },
        "body": json.dumps({"url": url})
    }
