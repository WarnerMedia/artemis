import json
import os
from fnmatch import fnmatch

import boto3
from botocore.exceptions import ClientError

SECRETS_MANAGEMENT_SCHEME = os.environ.get("ARTEMIS_SECRETS_MANAGEMENT_SCHEME")
SECRETS_QUEUE = os.environ.get("SECRETS_QUEUE")
AUDIT_QUEUE = os.environ.get("ARTEMIS_AUDIT_QUEUE")
REGION = os.environ.get("REGION", "us-east-2")
S3_BUCKET = os.environ.get("S3_BUCKET")
SECRETS_ENABLED = os.environ.get("SECRETS_ENABLED", "false").lower() == "true"

if SECRETS_QUEUE and AUDIT_QUEUE:
    # This is in a conditional so it doesn't run when this file is loaded during unit testing
    SQS = boto3.client("sqs")

# Load services.json outside of the Lambda handler so it get reused if the Lambda instance is reused
if S3_BUCKET:
    # This is in a conditional so it doesn't run when this file is loaded during unit testing
    S3 = boto3.resource("s3", region_name=REGION)
    SERVICES_FILE = S3.Object(S3_BUCKET, "services.json").get()
    SERVICES = json.loads(SERVICES_FILE["Body"].read().decode("utf-8"))

SECRETS_MANAGEMENT = {}
if SECRETS_MANAGEMENT_SCHEME:
    SECRETS_MANAGEMENT = {SECRETS_MANAGEMENT_SCHEME: SECRETS_QUEUE}  # Secrets go to the secrets queue


def handler(event, _):
    for item in event["Records"]:
        process(json.loads(item["body"]))


def process(event):
    if event["type"] == "secrets":
        # Get all of the secrets management processes that are applicable for this event
        processes = determine_secrets_management_processes(event)

        # Go through the matches processes and forward the event along
        for process in processes:
            if process not in SECRETS_MANAGEMENT:
                # There is a disconnect between the processes known by this Lambda and the ones listed in services.json
                print(f"Unknown secrets management process: {process}")
                continue

            # If the secrets queue is not enabled and the process would be sent to that queue do nothing instead
            if not SECRETS_ENABLED and SECRETS_MANAGEMENT[process] == SECRETS_QUEUE:
                continue

            try:
                # Forward the event along by putting it in the queue consumed by this secrets management process
                SQS.send_message(QueueUrl=SECRETS_MANAGEMENT[process], MessageBody=json.dumps(event))
            except ClientError:
                print("Unable to queue event")
    elif event["type"] == "audit":
        try:
            SQS.send_message(QueueUrl=AUDIT_QUEUE, MessageBody=json.dumps(event["event"]))
        except ClientError:
            print("Unable to queue event")
    else:
        print(f"Unknown event type: {str(event.get('type'))}")


def determine_secrets_management_processes(event: dict, services: dict = None) -> list:
    processes = []

    if services is None:
        services = SERVICES

    # Get the secrets_management config from the services dict
    sm = services["services"].get(event["service"], {}).get("secrets_management", {})

    # Loop through each named process
    for process in sm:
        include_process = False

        # Check all the inclusion globs to see if the repo matches
        for include in sm[process].get("include", []):
            if fnmatch(event["repo"], include):
                # Repo matches so this process will be included
                include_process = True
                break

        if not include_process:
            # Repo didn't match an inclusion glob so no need to check the exclusions
            continue

        # Check all of the exclude globs to see if the repo matches
        for exclude in sm[process].get("exclude", []):
            if fnmatch(event["repo"], exclude):
                # Matching on an exclusion overrides inclusion
                include_process = False
                break

        # Repo is still marked as included in this process so add it to the list
        if include_process:
            processes.append(process)

    # Return the list of all included secrets management processes
    return processes
