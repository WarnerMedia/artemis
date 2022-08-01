# pylint: disable=no-name-in-module, no-member
import os
import time

from botocore.exceptions import ClientError

from heimdall_utils.aws_utils import get_dynamodb_connection, get_sqs_connection
from heimdall_utils.utils import Logger

REGION = os.environ.get("REGION", "us-east-2")
RETRY_EXCEPTIONS = ["ProvisionedThroughputExceededException", "ThrottlingException"]

log = Logger(__name__)


def get_queue_size(repo_queue: str):
    """
    Connects to AWS to get the size of the current message queue
    """
    aws_sqs_client = get_sqs_connection(REGION)
    response = aws_sqs_client.get_queue_attributes(
        QueueUrl=repo_queue,
        AttributeNames=["ApproximateNumberOfMessages"],
    )
    return int(response["Attributes"]["ApproximateNumberOfMessages"])


def delete_processed_messages(repo_queue: str, receipt_handles: list):
    """
    Connects to AWS to delete received messages
    Feature Request: Execute delete_message_batch() in order to handle many deletes at once.
    https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/sqs.html#SQS.Client.delete_message_batch
    """
    aws_sqs_client = get_sqs_connection(REGION)
    for receipt_handle in receipt_handles:
        aws_sqs_client.delete_message(QueueUrl=repo_queue, ReceiptHandle=receipt_handle)


def get_sqs_message(queue: str, wait_time: int = 20) -> list:
    """
    Connects to AWS SQS to receive messages containing repos to scan
    """
    aws_sqs_client = get_sqs_connection(REGION)
    resp = aws_sqs_client.receive_message(
        QueueUrl=queue,
        MaxNumberOfMessages=10,
        MessageAttributeNames=["All"],
        WaitTimeSeconds=wait_time,
    )

    return resp.get("Messages", [])


def send_sqs_message(queue: str, entries: list) -> bool:
    try:
        sqs = get_sqs_connection(REGION)
        sqs.send_message_batch(QueueUrl=queue, Entries=entries)
        return True
    except ClientError as e:
        log.error(f"Unable to re-queue repos: {str(e)}")
        return False


def batch_update_db(scan_table_name, scan_items, limiter=0):
    table = get_dynamodb_connection(REGION).Table(scan_table_name)
    try:
        with table.batch_writer() as batch:
            for scan_item in scan_items:
                batch.put_item(Item=scan_item)
    except ClientError as e:
        if e.response["Error"]["Code"] not in RETRY_EXCEPTIONS:
            log.warning(e)
            return
        if limiter >= 5:
            log.error("DynamoDB write limit reached. Dropping Records. Please increase write threshold.")
            return
        limiter += 1
        log.warning("DynamoDB write limit reached. Waiting 10 seconds.")
        time.sleep(10)
        batch_update_db(scan_table_name, scan_items, limiter)
