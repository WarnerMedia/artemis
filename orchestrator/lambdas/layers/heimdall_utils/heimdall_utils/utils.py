# pylint: disable=no-member
import json
import logging
import os
import sys
from collections import namedtuple
from datetime import datetime, timedelta
from json import JSONDecodeError

from heimdall_utils.logging.formatter import JsonFormatter
from heimdall_utils.logging.logger import HeimdallLogger
from typing import Dict, Any, IO

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
logging.getLogger("botocore").setLevel(logging.WARNING)


class Logger:
    """
    Factory Class for creating HeimdallLoggers with a default configuration

    The DefaultLogger for the Heimdall uses a JSONFormatter to structure
    the Lambda logs to include optional keys and the lambda_context
    for the processed request.

    Full Lambda Context object: https://docs.aws.amazon.com/lambda/latest/dg/python-context-object.html

    Only a subset of the lambda context are added to the logs:
    function_name (str): The name of the lambda function
        e.g. "heimdall_repo"

    function_version (str): The version of the lambda function
        e.g. $LATEST

    aws_request_id (str): The identifier of the invocation request.
        e.g. "a1b2dde3-34db-56a7-a89b-12b34f56aa78"


    Parameters:
        _lambda_content (Dict[str, Any]) private variable  to track the
            lambda context object to be used across all loggers

        name: The name of the Logger
        level: The logging level for the Logger
        formatter: A Formatter to track the keys in the generated logs
        stream: The IO stream for the given logger

    """

    __lambda_context: Dict[str, Any] = {}

    def __new__(
        cls,
        name: str,
        level: str = LOG_LEVEL,
        stream: IO = sys.stderr,
        lambda_context: Any = None,
        **kwargs,
    ) -> logging.Logger:

        additional_fields = {**kwargs}
        formatter = JsonFormatter(datefmt="%Y-%m-%d %H:%M:%S%z")

        if lambda_context:
            cls.__lambda_context = lambda_context
            context_dict = build_context_dict(lambda_context)
            additional_fields.update(context_dict)

        return HeimdallLogger(name, LEVEL_MAP[level], formatter, stream, **additional_fields)


def build_context_dict(context) -> Dict:
    return {
        "function_name": context.function_name,
        "function_version": context.function_version,
        "aws_request_id": context.aws_request_id,
    }


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
