import argparse
import json
import logging
import os
import subprocess
import sys

import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from types import TracebackType

CODE_DIRECTORY = "/work/base"
CVE_API_URL = "https://services.nvd.nist.gov/rest/json/cve/1.0"

APPLICATION = os.environ.get("APPLICATION", "artemis")
REGION = os.environ.get("REGION", "us-east-2")


def setup_logging(name):
    log = logging.getLogger(__name__)
    if not log.handlers:
        console = logging.StreamHandler()
        formatter = logging.Formatter(
            fmt=f"%(asctime)s %(levelname)-8s [{name}] %(message)s", datefmt="[%Y-%m-%dT%H:%M:%S%z]"
        )
        console.setFormatter(formatter)
        log.addHandler(console)
        log.setLevel(logging.INFO)

    return log


def handle_exception(exc_type: type, exc_value: BaseException, exc_traceback: TracebackType):
    log = logging.getLogger(__name__)
    log.critical("Uncaught Plugin Exception", exc_info=(exc_type, exc_value, exc_traceback))


sys.excepthook = handle_exception


def parse_args(in_args=None, extra_args=None):
    # Allow the path to be overridden on the command line. This lets the
    # plugin be tested against any path, not just the engine work path.
    parser = argparse.ArgumentParser()
    parser.add_argument("engine_vars", type=str, nargs="?", default="{}")
    parser.add_argument("images", type=str, nargs="?", default="{}")
    parser.add_argument("config", type=str, nargs="?", default="{}")
    parser.add_argument("path", type=str, nargs="?", default=CODE_DIRECTORY)

    for arg in extra_args or []:
        parser.add_argument(*arg[0], **arg[1])

    args = parser.parse_args(in_args)

    # Normalize the path
    if not args.path.endswith("/"):
        args.path += "/"

    # Load the engine vars
    try:
        args.engine_vars = json.loads(args.engine_vars)
    except json.JSONDecodeError:
        args.engine_vars = {}

    # Load the config dict
    try:
        args.config = json.loads(args.config)
    except json.JSONDecodeError:
        args.config = {}

    # Load the images dict
    try:
        args.images = json.loads(args.images)
    except json.JSONDecodeError:
        args.images = {}

    return args


def get_secret_with_status(name, log) -> dict:
    secret_name = f"{APPLICATION}/{name}"

    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=REGION)

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
    except NoCredentialsError:
        return {"status": False, "response": {"Unable to locate AWS credentials"}}
    except ClientError as e:
        if e.response["Error"]["Code"] in (
            "DecryptionFailureException",
            "InternalServiceErrorException",
            "InvalidParameterException",
            "InvalidRequestException",
            "ResourceNotFoundException",
        ):
            log.error("Unable to retrieve secret: %s", e)
        return {"status": False, "response": {"Boto Client Error"}}
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these
        # fields will be populated.
        if "SecretString" in get_secret_value_response:
            secret = get_secret_value_response["SecretString"]
            return {"status": True, "response": secret}

    return {"status": False, "response": {"Unable to retrieve secret"}}


def get_secret(name, log) -> dict:
    """
    This is a legacy function. Future plugins should use get_secret_with_status().
    Gets an AWS secret from Secrets Manager, parses the result from get_secret_with_status(),
    and returns the JSON dict response or an empty dict if getting the secret failed.
    """
    result = get_secret_with_status(name, log)
    if result["status"]:
        return json.loads(result["response"])
    log.error(result["response"])
    return {}


def get_object_from_json_dict(json_object: dict, traversal_list: list, logger):
    cur_object = json_object
    for item in traversal_list:
        cur_object = cur_object.get(item)
        if cur_object is None:
            logger.error("Could not find key %s in response object. \n Returning None.", item)
            return None
    return cur_object


def convert_string_to_json(output_str: str, log):
    if not output_str:
        return None
    try:
        return json.loads(output_str)
    except json.JSONDecodeError as e:
        log.error(e)
        return None


def docker_login(log, url: str, username: str, password: str, cwd: str = None) -> bool:
    """
    Log into the Docker repo at URL using the creds in Secrets Manager
    :param log: Logger object to use for logging
    :param url: The URL of the Docker repo
    :param username: Repository credentials username
    :param password: Repository credentials password
    :param cwd: The directory to run `docker login` in [OPTIONAL]
    :return: boolean
    """
    log.info("Logging into Docker image repository %s", url)
    r = subprocess.run(
        ["docker", "login", url, f"-u={username}", f"-p={password}"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=cwd,
        check=False,
    )
    if r.returncode != 0:
        # Log the error but keep going
        log.error(r.stderr.decode("utf-8"))
        return False

    log.info("Login successful")
    return True
