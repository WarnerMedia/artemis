# pylint: disable=no-member
import json
import logging
import os
import sys
from collections import namedtuple
from datetime import datetime, timedelta
from json import JSONDecodeError

DEFAULT_LOG_LEVEL = "INFO"
LOG_LEVEL = os.environ.get("HEIMDALL_LOG_LEVEL", DEFAULT_LOG_LEVEL).upper()

LEVEL_MAP = {
    "CRITICAL": logging.CRITICAL,
    "ERROR": logging.ERROR,
    "WARNING": logging.WARNING,
    "INFO": logging.INFO,
    "DEBUG": logging.DEBUG,
    "NOTSET": logging.NOTSET,
}

DYNAMODB_TTL_DAYS = 60
logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)


class Logger:
    def __new__(cls, name: str, level=LOG_LEVEL):
        log = logging.getLogger(name.strip())
        if log.hasHandlers():
            # The AWS Lambda environment starts with a handler already configured so remove it
            # to replace it with our own.
            for handler in log.handlers:
                log.removeHandler(handler)
        console = logging.StreamHandler(sys.stderr)
        formatter = logging.Formatter(
            fmt="%(asctime)s %(levelname)-8s [%(name)-12s] %(message)s", datefmt="[%Y-%m-%d %H:%M:%S%z]"
        )
        console.setFormatter(formatter)
        log.addHandler(console)
        log.setLevel(LEVEL_MAP.get(level, DEFAULT_LOG_LEVEL))
        log.propagate = False
        return log


class ServiceInfo:
    # pylint: disable=too-many-instance-attributes
    def __init__(self, service, service_dict, org, api_key, cursor=None):
        self.service = service
        self.url = service_dict.get("url")
        self.branch_url = service_dict.get("branch_url")
        self.org = org
        self.api_key = api_key
        self.cursor = cursor
        self.service_org = f"{self.service}/{self.org}"
        self.app_integration = service_dict.get("app_integration", False)


ScanOptions = namedtuple("ScanOptions", ["default_branch_only", "plugins", "batch_id"])


class JSONUtils:
    def __init__(self, logger):
        self.log = logger

    def get_json_from_response(self, response_text: str) -> dict or None:
        try:
            return json.loads(response_text)
        except (JSONDecodeError, TypeError) as e:
            self.log.error("Error occurred converting response to JSON: %s\n Error: %s", response_text, e)
            return None

    def get_object_from_json_dict(self, json_object: dict, traversal_list: list):
        cur_object = json_object
        for item in traversal_list:
            cur_object = cur_object.get(item)
            if cur_object is None:
                self.log.error("Could not find key %s in response object. \n Returning None.", item)
                return None
        return cur_object


def get_json_from_file(file_path):
    with open(file_path) as json_file:
        return json.load(json_file)


def get_ttl_expiration():
    return int((datetime.utcnow().replace(microsecond=0) + timedelta(days=DYNAMODB_TTL_DAYS)).timestamp())
