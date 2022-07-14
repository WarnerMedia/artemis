import json
import os

import boto3

REGION = "us-east-2"
SQS_ENDPOINT = os.environ.get("SQS_ENDPOINT", None)


def poll(queue):
    sqs = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=REGION)

    resp = sqs.receive_message(QueueUrl=queue, MaxNumberOfMessages=1, MessageAttributeNames=["All"], WaitTimeSeconds=20)

    messages = resp.get("Messages", [])
    msg = messages[0] if messages else None

    if msg:
        receipt_handle = msg["ReceiptHandle"]
        sqs.delete_message(QueueUrl=queue, ReceiptHandle=receipt_handle)
    return msg


def process(msg):
    event = json.loads(msg["Body"])
    with open("out.csv", "a+") as f:
        write_line(event, f, masked=False)
    with open("out_masked.csv", "a+") as f:
        write_line(event, f, masked=True)


def write_line(event, handler, masked=False):
    if isinstance(event["details"]["match"], list):
        for match in event["details"]["match"]:
            handler.write(
                "%s,%s,%s,%s\n"
                % (event["repo"], event["details"]["type"], mask_value(match, masked), event["filename"])
            )
    else:
        handler.write(
            "%s,%s,%s,%s\n"
            % (
                event["repo"],
                event["details"]["type"],
                mask_value(event["details"]["match"], masked),
                event["filename"],
            )
        )


def mask_value(value, masked=False):
    if not masked:
        return value
    return "%sXXXXXXXXXXXX" % value[:4]


def main():
    EVENT_QUEUE = os.environ.get("EVENT_QUEUE")
    if not EVENT_QUEUE:
        print("No EVENT_QUEUE defined")
        return

    while True:
        try:
            msg = poll(EVENT_QUEUE)
            if msg:
                process(msg)
        except Exception as e:  # pylint: disable=broad-except
            # Catch everything so that an error doesn't kill the engine
            # but log the exception with stack trace so it can be
            # investigated.
            print("Error: %s", e)


if __name__ == "__main__":
    main()
