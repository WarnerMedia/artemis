# pylint: disable=no-name-in-module, no-member
import json

import boto3
import requests
from botocore.exceptions import ClientError
from requests import Response

from heimdall_utils.env import APPLICATION, DEFAULT_API_TIMEOUT
from heimdall_utils.utils import Logger
from heimdall_utils.variables import REGION, REV_PROXY_SECRET, REV_PROXY_SECRET_REGION

log = Logger(__name__)


def get_sqs_connection(region):
    return boto3.client("sqs", region_name=region)


def get_dynamodb_connection(region):
    return boto3.resource("dynamodb", region_name=region)


def get_s3_connection(region):
    return boto3.resource("s3", region_name=region)


def get_heimdall_secret(secret_name: str):
    """
    Get a secret out of secrets manager.
    """
    return get_secret(f"{APPLICATION}/{secret_name}")


def get_secret(secret_name: str):
    """
    Get a secret out of secrets manager.
    """
    get_secret_value_response = get_key(secret_name)
    if not get_secret_value_response:
        return None
    # Decrypts secret using the associated KMS CMK.
    # Depending on whether the secret is a string or binary, one of these
    # fields will be populated.
    if "SecretString" in get_secret_value_response:
        secret = get_secret_value_response["SecretString"]
        return json.loads(secret)
    return None


def get_key(secret_name, region=REGION):
    """
    Gets secret key from AWS Secrets Manager
    """
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region)

    try:
        return client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        if e.response["Error"]["Code"] in (
            "DecryptionFailureException",
            "InternalServiceErrorException",
            "InvalidParameterException",
            "InvalidRequestException",
            "ResourceNotFoundException",
        ):
            raise e
        log.error(e.response)
        return None


def queue_service_and_org(
    queue, service, org_name, page, default_branch_only, plugins, batch_id: str, redundant_scan_query: dict
):
    try:
        sqs = get_sqs_connection(REGION)
        sqs.send_message(
            QueueUrl=queue,
            MessageBody=json.dumps(
                {
                    "service": service,
                    "org": org_name,
                    "page": page,
                    "default_branch_only": default_branch_only,
                    "plugins": plugins,
                    "batch_id": batch_id,
                    "redundant_scan_query": redundant_scan_query,
                }
            ),
        )
        log.info(f"Queued {service}/{org_name} for scanning")
        return True
    except ClientError:
        log.info(f"Unable to queue org: {service}/{org_name}")
        return False


def queue_branch_and_repo(
    queue: str,
    service: str,
    org_name: str,
    branch_cursor: str,
    repo: str,
    plugins: dict,
    batch_id: str,
    redundant_scan_query: str,
):
    try:
        sqs = get_sqs_connection(REGION)
        sqs.send_message(
            QueueUrl=queue,
            MessageBody=json.dumps(
                {
                    "service": service,
                    "org": org_name,
                    "plugins": plugins,
                    "batch_id": batch_id,
                    "redundant_scan_query": redundant_scan_query,
                    "repo": repo,
                    "page": {"branch_cursor": branch_cursor},
                }
            ),
        )
        log.info(f"Queued {service}/{org_name} for scanning")
        return True
    except ClientError:
        log.info(f"Unable to queue branches for repo {service}/{org_name}/{repo}")
        return False


class GetProxySecret:
    _secret = None

    def __new__(cls):
        if not cls._secret:
            cls._secret = get_key(REV_PROXY_SECRET, REV_PROXY_SECRET_REGION)["SecretString"]
        return cls._secret


def get_analyzer_api_key(api_key_loc) -> str or None:
    """
    Connect to AWS to retrieve the Analyzer API key out of secrets manager
    """
    secret = get_secret(api_key_loc)
    if secret:
        return secret.get("key")
    return None


def send_analyzer_request(url: str, api_key: str, request_json: dict) -> Response:
    """
    Connects to Analyzer API to send repo scan request.
    """
    return requests.post(
        url=url,
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        json=request_json,
        timeout=DEFAULT_API_TIMEOUT,
    )
