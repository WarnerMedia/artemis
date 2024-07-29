from botocore.exceptions import ClientError

from aws_lambda_powertools.logging import Logger
from aws_lambda_powertools.utilities.typing import LambdaContext

from heimdall_utils.aws_utils import get_sqs_connection
from heimdall_utils.env import APPLICATION
from heimdall_utils.variables import REGION


log = Logger(service=APPLICATION, name="redrive")


@log.inject_lambda_context
def run(event: dict, context: LambdaContext) -> None:
    client = get_sqs_connection(REGION)
    source_queue = event.get("source", "")
    destination_queue = event.get("destination", "")

    source_queue_arn, message_count = get_attributes(client, source_queue)
    destination_queue_arn, _ = get_attributes(client, destination_queue)

    if message_count > 0:
        start_redrive(client, source_queue_arn, destination_queue_arn)
    log.info("Redrive Event Complete")


def get_attributes(client, queue_url: str) -> tuple:
    """
    Retrieve the QueueArn and ApproximateNumberOfMessages attributes of an AWS SQS queue.
    """
    try:
        response = client.get_queue_attributes(
            QueueUrl=queue_url, AttributeNames=["ApproximateNumberOfMessages", "QueueArn"]
        )
        num_of_messages = int(response["Attributes"]["ApproximateNumberOfMessages"])
        return response["Attributes"]["QueueArn"], num_of_messages
    except ClientError as e:
        log.error("Unable to retrieve Queue Attributes. Error: %s", e)
        return None, None


def start_redrive(client, source_queue_arn: str, destination_queue_arn: str) -> None:
    """
    Trigger a task to move messages from the source queue to a specified destination queue.
    """
    try:
        client.start_message_move_task(
            SourceArn=source_queue_arn,
            DestinationArn=destination_queue_arn,
            MaxNumberOfMessagesPerSecond=50,
        )
        log.info("Kicked off redrive task")
    except ClientError as e:
        log.error("Unable to kickoff redrive task. Error: %s", e)
