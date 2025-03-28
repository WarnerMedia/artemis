import json
import pytest
import logging
from artemislib.logging import Logger, JSONFormatter

LOG_MESSAGE1 = {"level": "INFO", "message": "Scanning Repository", "repo": "Warnermedia/artemis", "scan_id": "1234"}
LOG_MESSAGE2 = {"level": "CRITICAL", "message": "Unable To process task", "scan_id": "1234"}

LAMBDA_LOG_MESSAGE = {
    "level": "ERROR",
    "message": "Unable to Queue a Scan",
    "function_arn": "https://test-function",
    "function_name": "test-function",
    "function_memory_size": "1024",
    "function_request_id": "1234-1234",
    "function_version": "v1.23.0",
    "api_request_id": "456-456",
    "api_path": "v1/test/path",
    "repo": "Warnermedia/artemis",
}


@pytest.fixture(scope="function")
def custom_caplog(caplog):
    logger = logging.getLogger()
    original_factory = logging.getLogRecordFactory()

    # Use our custom formatter with the capture log handler.
    caplog.handler.setFormatter(JSONFormatter())
    logger.addHandler(caplog.handler)

    yield caplog

    logger.removeHandler(caplog.handler)
    logging.setLogRecordFactory(original_factory)
    Logger.reset_fields()


def test_add_and_remove_fields_engine(custom_caplog):
    logger = Logger("test_logger")
    Logger.add_fields(repo="Warnermedia/artemis", priority_task_queue=False, scan_id="1234")
    logger.info("Scanning Repository")
    Logger.remove_fields("repo", "priority_task_queue")
    logger.critical("Unable To process task")

    log_outputs = custom_caplog.text.strip().split("\n")
    log1 = remove_flaky_fields(json.loads(log_outputs[0]))
    log2 = remove_flaky_fields(json.loads(log_outputs[1]))
    assert log1 == LOG_MESSAGE1
    assert log2 == LOG_MESSAGE2


def test_inject_lambda_context(custom_caplog):
    @Logger.inject_lambda_context
    def handler(event, context):
        return

    logger = Logger("test_logger")
    lambda_event = {"requestContext": {"requestId": "456-456", "path": "v1/test/path"}}
    handler(lambda_event, LambdaContext())

    logger.error("Unable to Queue a Scan", extra={"repo": "Warnermedia/artemis"})
    log_output = custom_caplog.text.strip()
    log_output = remove_flaky_fields(json.loads(log_output))
    assert log_output == LAMBDA_LOG_MESSAGE


class LambdaContext:
    invoked_function_arn = "https://test-function"
    function_name = "test-function"
    memory_limit_in_mb = "1024"
    aws_request_id = "1234-1234"
    function_version = "v1.23.0"


def remove_flaky_fields(log_message: dict):
    log_message.pop("timestamp")
    log_message.pop("location")
    return log_message
