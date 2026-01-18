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
    """

    def __init__(self, scope: Construct, id: str, **kwargs):
        super().__init__(scope, id, **kwargs)

        bucket = s3.Bucket(
            self,
            "FilesBucket",
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            cors=[
                s3.CorsRule(
                    allowed_methods=[s3.HttpMethods.PUT, s3.HttpMethods.GET],
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

        bucket.grant_read(get_lambda)
        bucket.grant_put(put_lambda)

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

        key = api.add_api_key("ClientApiKey")

        plan = api.add_usage_plan(
            "UsagePlan",
            name="StandardPlan",
            throttle=apigw.ThrottleSettings(rate_limit=10, burst_limit=2)
        )

        plan.add_api_key(key)

        get = api.root.add_resource("get-url")
        put = api.root.add_resource("put-url")

        get_method = get.add_method(
            "GET",
            apigw.LambdaIntegration(get_lambda),
            api_key_required=True
        )

        put_method = put.add_method(
            "GET",
            apigw.LambdaIntegration(put_lambda),
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
                f"3. Remember to include the 'X-Api-Key' header in your requests"
            ),
            description="Instructions for using your new API"
        )
