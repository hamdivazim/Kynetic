# Kynetic Presigned URL API Deployment Guide

This CDK Stack deploys a secure, serverless API that generates S3 Presigned URLs for uploading and downloading files. It includes a private S3 bucket, two Lambda functions, and an API Gateway secured by an API Key.

## Prerequisites

Before you start, ensure you have the following installed on your local machine:

1. Python 3.11+
2. Node.js (LTS version) – Required for the CDK Toolkit.
3. AWS CLI - [Installation Link](https://aws.amazon.com/cli/).


## 1: Set Up Your AWS Credentials

If you don't have an Access Key and Secret Key, you need to create them in the AWS Console.

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/).
2. Search for IAM in the top search bar.
3. Go to Users / Create user.
4. Attach the `AdministratorAccess` either through a group or directly.
5. Once created, click on the user name / Security credentials tab.
6. Scroll to Access keys / Create access key.
7. Select Command Line Interface (CLI), check the box, and click Next.
8. **IMPORTANT:** Copy your Access Key ID and Secret Access Key. You will not see the Secret Key again.

Now, configure your computer:
Open your terminal and run:

```bash
aws configure

```

Paste your Access Key and Secret Key when prompted.
Default region: eg, `us-east-1`.


## 2: Project Setup

Clone your repository and set up the Python environment.

```bash
# 1. Install AWS CDK globally
npm install -g aws-cdk

# 2. Navigate to project root
cd kynetic-cdk-project

# 3. Create and activate a virtual environment
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# 4. Install dependencies
pip install -r requirements.txt

```

## 3: Deploy

Before the first deployment, you must "Bootstrap" your AWS account (sets up an S3 bucket for CDK assets).

```bash
# Prepare the AWS environment (Only do this once)
cdk bootstrap

# Deploy the stack
cdk deploy

```

Wait for the green checkmarks. At the end, the terminal will print Outputs, including your `APIKeyId`.

## 4: Find Your URL & Key in the Console

You can find your API Deployment URL and key in the AWS Dashboard:

### Find your API URL

1. Go to the API Gateway console.
2. Click on `Kynetic-PresignedURL-API`.
3. On the left menu, click Stages / `prod`.
4. Your Invoke URL is at the top (it looks like `https://xxx.execute-api.us-east-1.amazonaws.com/prod`).

### Find your API Key

1. In the API Gateway console, click API Keys on the left menu.
2. Click on `ClientApiKey`.
3. Click Show next to the API Key value. You need to send this in the `X-Api-Key` header of your requests.

## 5: How to Use It

To get a URL to upload a file named `photo.jpg`:

**Request:**

```http
GET https://YOUR_API_URL/put-url?key=photo.jpg
X-Api-Key: YOUR_API_KEY

```

**Response:**

```json
{
  "url": "https://filesbucket-xxx.s3.amazonaws.com/photo.jpg?AWSAccessKeyId=..."
}

```

---

## 6: How to Delete Stack

To avoid being charged for resources you aren't using, you can tear down the entire stack with one command:

```bash
cdk destroy

```

* Note: By default, S3 buckets containing files will not be deleted for safety. You may need to manually empty and delete the FilesBucket (named like`kyneticcdkstack-filesbucket0000000-xxxxxxxxx`) in the S3 console.

### Security Warning

The `allowed_origins=["*"]` setting in `cdk_stack.py` and the Lambda headers is currently for development only. If you have your own website URL (eg, `https://myapp.com`), replace the `*` with your actual domain to prevent unauthorized websites from using your API.