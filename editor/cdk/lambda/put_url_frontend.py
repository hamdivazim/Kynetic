import json
import os
import re

import boto3

s3 = boto3.client("s3")
BUCKET = os.environ["BUCKET_NAME"]

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Api-Key",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
}

#image/svg+xml, application/octet-stream, text/plain
CONTENT_TYPE_RE = re.compile(r"[\w!#$&^_.+-]+/[\w!#$&^_.+-]+")


def _response(status_code, body):
    """JSON response with CORS headers on every reply (errors included)."""
    return {
        "statusCode": status_code,
        "headers": {**CORS_HEADERS, "Content-Type": "application/json"},
        "body": json.dumps(body),
    }


def handler(event, context):
    """
    AWS Lambda handler for Kynetic AWS put-url-frontend API (browser/editor route).

    Same presigned-URL contract as put_url, except the Content-Type header is
    signed into the presigned URL (the browser always sends one, which can
    otherwise cause a SignatureDoesNotMatch 403) and every response carries
    CORS headers so the browser can read it.

    https://github.com/hamdivazim/Kynetic

    :param event: Description
    :param context: Description
    """

    method = (
        event.get("requestContext", {}).get("http", {}).get("method")
        or event.get("httpMethod")
        or ""
    )
    if method == "OPTIONS":
        return {"statusCode": 204, "headers": CORS_HEADERS, "body": ""}

    query_params = event.get("queryStringParameters") or {}
    key = query_params.get("key")
    if not key:
        return _response(400, {"error": "Missing query parameter: key"})

    content_type = query_params.get("content_type") or "application/octet-stream"
    if not CONTENT_TYPE_RE.fullmatch(content_type):
        return _response(400, {"error": "Invalid content_type"})

    url = s3.generate_presigned_url(
        "put_object",
        Params={"Bucket": BUCKET, "Key": key, "ContentType": content_type},
        ExpiresIn=300,
    )

    return _response(200, {"url": url})
