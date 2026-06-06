import requests, sys
from pathlib import Path
from urllib.parse import urljoin, urlencode

def fetch_from_s3(api, api_key, obj_key, log, base: Path):
    """
    Fetches an object (image) from S3, using the API deployed via the Kynetic CDK Stack.
    
    :param api: URL of deployed API
    :param api_key: API Key of deployed API
    :param obj_key: Object key in S3
    :param log: Logging object from main render job
    :param base: A Path object pointing to the temporary directory
    """

    if not api.endswith("/"):
        api += "/"
    obj_key = obj_key.removeprefix("s3://")

    # fetch S3 presigned url from API Gateway
    get_presigned_url = urljoin(api, "prod/get-url")+"?"+urlencode({
        "key": obj_key
    })

    presigned_url_response = requests.get(
        get_presigned_url, headers={
            "x-api-key": api_key
        }
    )

    presigned_url_response.raise_for_status()
    presigned_url = presigned_url_response.json().get("url")

    output_path = base / obj_key.lstrip("/")
    output_path.parent.mkdir(parents=True, exist_ok=True)

    # download S3 object using presigned URLs
    with requests.get(presigned_url, stream=True) as response:
        if response.status_code == 404:
            log.critical("Error 404 - Check the object key and API URL are correct.")
            sys.exit(1)
        else:
            response.raise_for_status()

        with open(output_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)

    return output_path
