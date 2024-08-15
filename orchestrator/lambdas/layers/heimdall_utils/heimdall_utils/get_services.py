# pylint: disable=no-member
import json
import os
from aws_lambda_powertools import Logger

from heimdall_utils.aws_utils import get_s3_connection
from heimdall_utils.env import APPLICATION
from heimdall_utils.variables import ARTEMIS_S3_BUCKET, REGION

log = Logger(service=APPLICATION, name=__name__, child=True)


def get_services_dict(s3_key: str = None):
    if not s3_key:
        s3_key = "services.json"
    s3 = get_s3_connection(REGION)
    s3_object = s3.Object(ARTEMIS_S3_BUCKET, s3_key)
    return json.loads(s3_object.get()["Body"].read().decode("utf-8"))
