from io import StringIO
from unittest import TestCase
import json
import logging
from artemislib.logging import Logger, inject_plugin_logs

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


class TestLogger(TestCase):
    def setUp(self):
        self.buffer = StringIO()
        self.logger = Logger("test_logger", stream=self.buffer)
        self.engine_context = {}
        self.lambda_context = LambdaContext()
        self.lambda_event = {"requestContext": {"requestId": "456-456", "path": "v1/test/path"}}

        Logger.reset_fields()

    def tearDown(self):
        for handler in self.logger.handlers[:]:
            self.logger.removeHandler(handler)

    def test_add_and_remove_fields_engine(self):
        Logger.add_fields(repo="Warnermedia/artemis", priority_task_queue=False, scan_id="1234")
        self.logger.info("Scanning Repository")
        Logger.remove_fields("repo", "priority_task_queue")
        self.logger.critical("Unable To process task")

        log_outputs = self.buffer.getvalue().strip().split("\n")
        log1 = remove_flaky_fields(json.loads(log_outputs[0]))
        log2 = remove_flaky_fields(json.loads(log_outputs[1]))
        self.assertEqual(log1, LOG_MESSAGE1)
        self.assertEqual(log2, LOG_MESSAGE2)

    def test_inject_lambda_context(self):
        @Logger.inject_lambda_context
        def handler(event, context):
            return

        handler(self.lambda_event, self.lambda_context)
        self.logger.error("Unable to Queue a Scan", extra={"repo": "Warnermedia/artemis"})
        log_output = self.buffer.getvalue().strip()
        log_output = remove_flaky_fields(json.loads(log_output))
        self.assertDictEqual(log_output, LAMBDA_LOG_MESSAGE)


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
