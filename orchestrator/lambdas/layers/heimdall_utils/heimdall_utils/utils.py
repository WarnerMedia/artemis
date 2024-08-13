# pylint: disable=no-member
import json
import logging
import time
from collections import namedtuple
from datetime import datetime, timedelta
from json import JSONDecodeError
from typing import Optional

from aws_lambda_powertools import Logger

from heimdall_utils.env import APPLICATION

# Set log levels for external packages
logging.getLogger("requests").setLevel(logging.WARNING)
logging.getLogger("urllib3").setLevel(logging.WARNING)
logging.getLogger("botocore").setLevel(logging.WARNING)

DYNAMODB_TTL_DAYS = 60
TIMESTAMP_FORMAT = "%Y-%m-%dT%H:%M:%SZ"


log = Logger(service=APPLICATION, name=__name__, child=True)


class ServiceInfo:
    # pylint: disable=too-many-instance-attributes
    def __init__(self, service, service_dict, org, api_key, repo_cursor=None, branch_cursor=None):
        self.service = service
        self.url = service_dict.get("url")
        self.branch_url = service_dict.get("branch_url")
        self.org = org
        self.api_key = api_key
        self.repo_cursor = repo_cursor
        self.branch_cursor = branch_cursor
        self.service_org = f"{self.service}/{self.org}"
        self.app_integration = service_dict.get("app_integration", False)


ScanOptions = namedtuple("ScanOptions", ["default_branch_only", "plugins", "batch_id", "repo"])


class JSONUtils:
    def __init__(self, logger):
        self.log = logger

    def get_json_from_response(self, response_text: str) -> Optional[dict]:
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


def parse_timestamp(timestamp: Optional[str] = None) -> str:
    """
    Validates and processes a given timestamp string.

    A valid timestamp string will match the ISO 8601 format
    and have a date that is greater than 90 days.

    If valid, it returns the original timestamp. If invalid or not provided,
    it generates and returns a timestamp for a date exactly 3 months prior to
    the current date and time.

    Args:
        timestamp (Optional[str]): A timestamp string in ISO 8601 format.
            Defaults to None.

    Returns:
        str: Either the validated input timestamp or a generated timestamp
             string representing a date 3 months ago, in ISO 8601 format.

    Examples:
        >>> parse_timestamp()
        {"level":"DEBUG","location":"parse_timestamp","message":"Generating Default timestamp"}
        "2024-04-24T22:35:36Z"  # Output will vary based on the current date and time

        >>> parse_timestamp("2024-06-24T22:50:00Z")
        "2024-06-24T22:50:00Z"

    Notes:
        - The function uses the current system time to calculate the 3-month offset.
        - All returned timestamps are in UTC (denoted by the 'Z' suffix).
    """
    try:
        if timestamp and is_valid_timestamp(timestamp):
            return timestamp
    except (TypeError, ValueError):
        log.error("Timestamp is invalid")

    log.debug("Generating Default timestamp")
    default_timestamp = get_default_datetime()
    result = default_timestamp.timestamp()

    return time.strftime(TIMESTAMP_FORMAT, time.gmtime(result))


def is_valid_timestamp(timestamp: str) -> bool:
    default_timestamp = get_default_datetime()
    current_timestamp = datetime.strptime(timestamp, TIMESTAMP_FORMAT)

    return current_timestamp > default_timestamp


def get_default_datetime() -> datetime:
    current_timestamp = datetime.now()
    three_months_ago = current_timestamp - timedelta(days=90)
    return three_months_ago
