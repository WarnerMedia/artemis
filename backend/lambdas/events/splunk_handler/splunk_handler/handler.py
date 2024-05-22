import json
import os
from typing import Tuple

import boto3
import requests
from botocore.exceptions import ClientError
from requests.exceptions import RequestException

APPLICATION = os.environ.get("APPLICATION", "artemis")
ENVIRONMENT = os.environ.get("ENVIRONMENT", "nonprod")
SM_KEY = os.environ.get("ARTEMIS_SPLUNK_KEY", f"{APPLICATION}/splunk-hec")
SCRUB_NONPROD = os.environ.get("ARTEMIS_SCRUB_NONPROD", "true").lower() == "true"
SCRUB_DETAILS = os.environ.get("ARTEMIS_SCRUB_DETAILS", "false").lower() == "false"
REGION = os.environ.get("REGION", "us-east-2")


def handler(event, _):
    hec_token, hec_url = get_hec_config()
    if not (hec_token and hec_url):
        print("Error: Missing Splunk config")
        return

    for item in event["Records"]:
        splunk_event = json.loads(item["body"])

        if SCRUB_DETAILS or SCRUB_NONPROD and ENVIRONMENT != "prod":
            # If this lambda is not running in prod this will be sent to the
            # dev index so delete the sensitive details
            del splunk_event["details"]

        data = {"source": APPLICATION, "event": splunk_event}

        try:
            r = requests.post(hec_url, headers={"Authorization": f"Splunk {hec_token}"}, json=data)
            if r.status_code != 200:
                print(f"Error [HTTP {r.status_code}]: {r.text}")
        except RequestException as e:
            print(f"Error with request: {str(e)}")


def get_secret(secret_name, region=REGION):
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region)

    try:
        get_secret_value_response = client.get_secret_value(SecretId=secret_name)
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
            return json.loads(secret)

    return None


def get_hec_config() -> Tuple[str, str]:
    secret = get_secret(SM_KEY)
    if secret:
        return (secret.get("key"), secret.get("url"))
    return (None, None)
