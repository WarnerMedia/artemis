# pylint: disable=no-member
import json
import os

from heimdall_utils.aws_utils import get_s3_connection
from heimdall_utils.utils import Logger
from heimdall_utils.variables import ARTEMIS_S3_BUCKET, REGION, ROOT_DIR

log = Logger(__name__)


def _get_services_from_file(service_file):
    if service_file is None:
        service_file = "services.json"
    if os.path.exists(service_file):
        with open(service_file) as services_file:
            return json.load(services_file)
    log.error(
        "%s not found or could not load contents into dictionary," "services will be unrecognized and invalidated",
        service_file,
    )
    return None


def _get_services_s3_object(s3_key):
    if s3_key is None:
        s3_key = "services.json"
    s3 = get_s3_connection(REGION)
    s3_object = s3.Object(ARTEMIS_S3_BUCKET, s3_key)
    return json.loads(s3_object.get()["Body"].read().decode("utf-8"))


def get_services_dict(services_loc: str):
    if services_loc is not None and ROOT_DIR in services_loc:
        log.warning("Please confirm this is a testing environment.")
        return _get_services_from_file(services_loc)

    return _get_services_s3_object(services_loc)
