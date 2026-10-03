# Presigned URL API (AWS CDK)

This stack deploys a small serverless API on your AWS account that hands out S3 presigned URLs for
uploading and downloading SVG assets: a private S3 bucket, four Lambda functions, and
an API Gateway secured by an API key. It is entirely optional. The editor and
renderer work without it.

## Prerequisites

1. Python 3.11+
2. Node.js (LTS) required for the CDK toolkit
3. AWS CLI - [installation guide](https://aws.amazon.com/cli/)

## 1. Set up your AWS credentials

If you don't have an access key yet, create one in the AWS Console. Instructions available on [AWS Documentation](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-quickstart.html).

## 2. Project setup

```bash
npm install -g aws-cdk

cd editor/cdk

python -m venv .venv
source .venv/bin/activate      # Windows: .venv\Scripts\activate

pip install -r requirements.txt
```

## 3. Deploy

The first deployment needs a one-off bootstrap (it provisions an S3 bucket for CDK
assets):

```bash
cdk bootstrap     # once per account/region
cdk deploy
```

Wait for it to finish. The terminal prints the stack Outputs, including
`ApiKeyId`, the ID of the API key (not its value; you'll fetch that in step 4).

## 4. Find your API key in the CLI

1. Run the command outputted by the CDK stack (`aws apigateway get-api-key --api-key {key.key_id} --include-value`).
2. The value field is your API key.
3. API URL will also be outputted by the CDK Stack.

Send this value in the `X-Api-Key` header of every request. The editor stores both in
localStorage via the AWS Setup dialog; pass them to the renderer as
`KYNETIC_API_URL` / `KYNETIC_API_KEY`.

## 5. Using the API

The stack exposes two parallel sets of presigned-URL routes. Every route requires the
`X-Api-Key` header, and the usage plan by default throttles to 10 requests/second with a burst of
2.

Presigned URLs are valid for 5 minutes.

Upload by `PUT`-ing the file to that URL with the same `Content-Type` you passed in.

## 6. Tearing down

To avoid paying for resources you aren't using:

```bash
cdk destroy
```

Redeploying later issues a new API key, so update the editor or renderer with the new
value. Note that S3 buckets containing files aren't deleted by default. Empty the
bucket (named like `kyneticcdkstack-filesbucket0000000-xxxxxxxxx`) in the S3 console
first if you want it gone.

### Security note

`allowed_origins=["*"]` in `cdk_stack.py` (and the matching Lambda headers) is a
development default. Before deploying publicly, replace `*` with the origin(s) where you host the editor. This restricts browser cross-origin requests from other origins; it does not replace API authentication or prevent non-browser clients from calling the API.