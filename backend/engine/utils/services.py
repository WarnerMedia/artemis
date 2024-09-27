from typing import Any, Optional
import json
import os

import boto3

from artemislib.logging import Logger

from env import REGION, S3_BUCKET

log = Logger(__name__)


def _get_services_from_file(service_file: str) -> Optional[Any]:
    if os.path.exists(service_file):
        with open(service_file) as services_file:
            return json.load(services_file)
    log.error(
        "%s not found or could not load contents into dictionary, services will be unrecognized and invalidated",
        service_file,
    )
    return None


def _get_services_s3_object(s3_key: str):
    s3 = boto3.resource("s3", region_name=REGION)
    s3_object = s3.Object(S3_BUCKET, s3_key)
    s3_object = s3_object.get()
    return json.loads(s3_object["Body"].read().decode("utf-8"))


def get_services_dict(services_loc: str, s3: bool):
    if s3:
        return _get_services_s3_object(services_loc)
    return _get_services_from_file(services_loc)
