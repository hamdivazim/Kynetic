from aws_cdk import (
    Stack,
    Duration,
    aws_s3 as s3,
    aws_lambda as _lambda,
    aws_apigateway as apigw,
    aws_iam as iam,
    CfnOutput
)
from constructs import Construct
import os

class KyneticCDKStack(Stack):
    """
    AWS CDK Stack for deploying Kynetic BYOC resources.

    https://github.com/hamdivazim/Kynetic
    """

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        bucket = s3.Bucket(
            self,
            "FilesBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.PUT, s3.HttpMethods.GET, s3.HttpMethods.HEAD],
                    allowed_origins=["*"], # todo:- only allow from final website (once live)
                    allowed_headers=["*"]
                )
            ]
        )

        get_lambda = _lambda.Function(
            self,
            "KyneticGetPresignedURL",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="get_url.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "../lambda")),
            environment={
                "BUCKET_NAME": bucket.bucket_name
            },
            timeout=Duration.seconds(10)
        )

        put_lambda = _lambda.Function(
            self,
            "KyneticPutPresignedURL",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="put_url.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "../lambda")),
            environment={
                "BUCKET_NAME": bucket.bucket_name
            },
            timeout=Duration.seconds(10)
        )

        get_lambda_frontend = _lambda.Function(
            self,
            "KyneticGetPresignedURLFrontend",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="get_url_frontend.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "../lambda")),
            environment={
                "BUCKET_NAME": bucket.bucket_name
            },
            timeout=Duration.seconds(10)
        )

        put_lambda_frontend = _lambda.Function(
            self,
            "KyneticPutPresignedURLFrontend",
            runtime=_lambda.Runtime.PYTHON_3_11,
            handler="put_url_frontend.handler",
            code=_lambda.Code.from_asset(os.path.join(os.path.dirname(__file__), "../lambda")),
            environment={
                "BUCKET_NAME": bucket.bucket_name
            },
            timeout=Duration.seconds(10)
        )

        bucket.grant_read(get_lambda)
        bucket.grant_put(put_lambda)
        bucket.grant_read(get_lambda_frontend)
        bucket.grant_put(put_lambda_frontend)

        api = apigw.RestApi(
            self,
            "Kynetic-PresignedURL-API",
            default_cors_preflight_options=apigw.CorsOptions(
                allow_origins=apigw.Cors.ALL_ORIGINS,  # todo:- only allow from final website (once live)
                allow_methods=["GET", "OPTIONS"],
                allow_headers=["Content-Type", "X-Api-Key"],
            ),
            api_key_source_type=apigw.ApiKeySourceType.HEADER
        )

        for response_id, response_type in (
            ("CorsDefault4xx", apigw.ResponseType.DEFAULT_4_XX),
            ("CorsDefault5xx", apigw.ResponseType.DEFAULT_5_XX),
        ):
            api.add_gateway_response(
                response_id,
                type=response_type,
                response_headers={
                    "Access-Control-Allow-Origin": "'*'",
                    "Access-Control-Allow-Headers": "'Content-Type,X-Api-Key'",
                    "Access-Control-Allow-Methods": "'GET,OPTIONS'",
                },
            )

        key = api.add_api_key("ClientApiKey")

        plan = api.add_usage_plan(
            "UsagePlan",
            name="StandardPlan",
            throttle=apigw.ThrottleSettings(rate_limit=10, burst_limit=2)
        )

        plan.add_api_key(key)

        routes = {
            "get-url": get_lambda,
            "put-url": put_lambda,
            "get-url-frontend": get_lambda_frontend,
            "put-url-frontend": put_lambda_frontend,
        }

        for parent in (api.root, api.root.add_resource("prod")):
            for name, fn in routes.items():
                parent.add_resource(name).add_method(
                    "GET",
                    apigw.LambdaIntegration(fn),
                    api_key_required=True
                )

        plan.add_api_stage(
            stage=api.deployment_stage
        )

        CfnOutput(
            self, "ApiKeyId",
            value=key.key_id,
            description="The ID of the API Key - use this to look up the value in the console or CLI"
        )

        CfnOutput(
            self, "NextSteps",
            value=(
                f"1. Get your API Key value: run 'aws apigateway get-api-key --api-key {key.key_id} --include-value' "
                f"2. To get a PUT url: {api.url}put-url?key=test.txt "
                f"3. Remember to include the 'X-Api-Key' header in your requests "
            ),
            description="Instructions for using your new API"
        )
