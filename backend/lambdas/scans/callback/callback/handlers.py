import json
import os

import boto3
import requests
from botocore.exceptions import ClientError
from requests.exceptions import RequestException

APPLICATION = os.environ.get("APPLICATION", "artemis")
REGION = os.environ.get("REGION", "us-east-2")


def handler(event, context):
    for item in event["Records"]:
        process(json.loads(item["body"]))


def process(callback):
    print("POST callback to %s" % callback["url"])

    body = {"client_id": callback["client_id"], "data": callback["data"]}

    headers = None

    # See if there is authentication information for this callback URL. If so
    # include it in the headers.
    auth = get_callback_auth(callback["url"])
    if auth:
        headers = {auth["header"]: auth["value"]}

    try:
        resp = requests.post(callback["url"], headers=headers, json=body)
        print("HTTP %s: %s" % (resp.status_code, resp.text))
    except RequestException as e:
        print("Error sending callback: %s" % e)


def get_callback_auth(url):
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=REGION)

    auth = {}

    try:
        get_secret_value_response = client.get_secret_value(SecretId=f"{APPLICATION}/callback-auth")
    except ClientError as e:
        if e.response["Error"]["Code"] in (
            "DecryptionFailureException",
            "InternalServiceErrorException",
            "InvalidParameterException",
            "InvalidRequestException",
            "ResourceNotFoundException",
        ):
            raise e
    else:
        # Decrypts secret using the associated KMS CMK.
        # Depending on whether the secret is a string or binary, one of these
        # fields will be populated.
        if "SecretString" in get_secret_value_response:
            secret = get_secret_value_response["SecretString"]
            auth = json.loads(secret)

    for key in auth:
        if url.startswith(key):
            return auth[key]

    return None
