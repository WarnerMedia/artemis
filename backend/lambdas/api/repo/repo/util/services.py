# pylint: disable=no-member
import json
import os

from repo.util.aws import AWSConnect
from repo.util.const import ROOT_DIR
from repo.util.env import LOCAL_SERVICES_OVERRIDE
from artemislib.logging import Logger

log = Logger(__name__)


def _get_services_from_file(service_file="services.json"):
    if os.path.exists(service_file):
        with open(service_file) as services_file:
            return json.load(services_file)
    log.error(
        "%s not found or could not load contents into dictionary," "services will be unrecognized and invalidated",
        service_file,
    )
    return None


def _get_services_s3_object(s3_key):
    aws_connect = AWSConnect()
    s3_object = aws_connect.get_s3_object(s3_key)
    return json.loads(s3_object.get()["Body"].read().decode("utf-8"))


def get_services_dict(services_loc: str):
    if ROOT_DIR in services_loc or LOCAL_SERVICES_OVERRIDE:
        log.warning("Please confirm this is a testing environment.")
        return _get_services_from_file(services_loc)

    return _get_services_s3_object(services_loc)
