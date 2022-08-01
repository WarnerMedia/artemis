# pylint: disable=no-name-in-module, no-member
import os

import boto3

from heimdall_utils.utils import Logger

REGION = os.environ.get("REGION", "us-east-1")
REPO_SCAN_LAMBDA = os.environ.get("HEIMDALL_REPO_SCAN_LAMBDA")
INVOKE_COUNT = int(os.environ.get("HEIMDALL_INVOKE_COUNT", "10"))

LOG = Logger(__name__)


def handler(_event=None, _context=None) -> list or None:
    aws_lambda = boto3.client("lambda", region_name=REGION)

    # Invoke the repo_scan lambda the configured number of times
    for i in range(INVOKE_COUNT):
        LOG.info("Invoking %s (%s of %s)", REPO_SCAN_LAMBDA, i + 1, INVOKE_COUNT)
        resp = aws_lambda.invoke(FunctionName=REPO_SCAN_LAMBDA, InvocationType="RequestResponse", Payload="{}")
        if resp["StatusCode"] == 200 and "FunctionError" not in resp:
            LOG.info("Invocation succeeded")
        else:
            LOG.error("Lambda function %s failed: %s", REPO_SCAN_LAMBDA, resp.get("FunctionError", "Unknown error"))
