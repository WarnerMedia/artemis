# pylint: disable=no-name-in-module, no-member
import os
from typing import Any
import boto3
from aws_lambda_powertools import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from heimdall_utils.env import APPLICATION

REGION = os.environ.get("REGION", "us-east-1")
REPO_SCAN_LAMBDA = os.environ.get("HEIMDALL_REPO_SCAN_LAMBDA")
INVOKE_COUNT = int(os.environ.get("HEIMDALL_INVOKE_COUNT", "10"))

log = Logger(service=APPLICATION, name="repo_scan_loop")

@log.inject_lambda_context
def handler(event:dict[str, Any]=None, context:LambdaContext=None) -> None:
    aws_lambda = boto3.client("lambda", region_name=REGION)

    # Invoke the repo_scan lambda the configured number of times
    for i in range(INVOKE_COUNT):
        log.info("Invoking %s (%s of %s)", REPO_SCAN_LAMBDA, i + 1, INVOKE_COUNT)
        resp = aws_lambda.invoke(FunctionName=REPO_SCAN_LAMBDA, InvocationType="RequestResponse", Payload="{}")
        if resp["StatusCode"] == 200 and "FunctionError" not in resp:
            log.info("Invocation succeeded")
        else:
            log.error("Lambda function %s failed: %s", REPO_SCAN_LAMBDA, resp.get("FunctionError", "Unknown error"))
