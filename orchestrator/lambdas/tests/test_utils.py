import json
import unittest

from heimdall_utils import utils
from heimdall_utils.logging.formatter import JsonFormatter
import json


EXPECTED_DEFAULT_KEYS = ("level", "location", "timestamp", "message")
EXPECTED_LOG_OUTPUT1 = {"level": "INFO", "message": "Testing Log messages"}
EXPECTED_LOG_OUTPUT2 = {
    "level": "INFO",
    "message": "Testing Log messages",
    "repo": "artemis",
    "org": "WarnerMedia",
}
EXPECTED_LOG_OUTPUT3 = {"level": "INFO", "message": "Testing Log messages"}

EXPECTED_LOG_OUTPUT4 = {
    "level": "ERROR",
    "message": "Error occurred while processing repo",
    "repo": "artemis",
    "org": "WarnerMedia",
}


class TestUtils(unittest.TestCase):
    def setUp(self) -> None:
        self.formatter = JsonFormatter()
        self.log = utils.Logger(__name__, "INFO")
        self.json_utils = utils.JSONUtils(self.log)

    def test_get_json_from_response_text_None(self):
        text = None
        expected_result = None

        result = self.json_utils.get_json_from_response(text)

        self.assertEqual(expected_result, result)

    def test_get_json_from_response_success(self):
        test_dict = {"something": "else"}

        result = self.json_utils.get_json_from_response(json.dumps(test_dict))

        self.assertEqual(test_dict, result)

    def test_log_message(self):
        with self.assertLogs(self.log) as logger:
            self.log.info("Testing Log messages")
        formatted_dict = json.loads(self.formatter.format(logger.records[0]))
        self.assertTrue(EXPECTED_LOG_OUTPUT1.items() <= formatted_dict.items())

    def test_log_add_keys(self):
        with self.assertLogs(self.log) as logger:
            self.log.info("Testing Log messages")

        self.formatter.add_keys(repo="artemis", org="WarnerMedia")
        formatted_dict = json.loads(self.formatter.format(logger.records[0]))
        self.assertTrue(EXPECTED_LOG_OUTPUT2.items() <= formatted_dict.items())

    def test_log_remove_keys(self):

        with self.assertLogs(self.log) as logger:
            self.log.info("Testing Log messages")
        self.formatter.remove_keys(["timestamp", "location"])
        formatted_dict = json.loads(self.formatter.format(logger.records[0]))
        self.assertTrue(EXPECTED_LOG_OUTPUT3.items() <= formatted_dict.items())

    def test_log_get_current_keys(self):
        self.formatter.remove_keys(["timestamp", "location"])
        keys = set(self.formatter.get_current_keys())
        self.assertEqual(keys, set(["level", "message"]))

    def test_log_error(self):
        self.log._formatter = self.formatter
        with self.assertLogs(self.log) as logger:
            self.log.remove_keys(["timestamp", "location"])
            self.log.add_keys(repo="artemis", org="WarnerMedia")
            self.log.error("Error occurred while processing repo")

        formatted_dict = json.loads(self.formatter.format(logger.records[0]))
        self.assertTrue(EXPECTED_LOG_OUTPUT4.items() <= formatted_dict.items())

    def test_reset_log_format(self):
        self.log._formatter = self.formatter
        self.log.remove_keys(["timestamp", "location"])
        self.log.add_keys(repo="artemis", org="WarnerMedia")
        self.log.reset_log_format()

        keys = set(self.log.get_current_keys())
        self.assertEqual(keys, set(["timestamp", "message", "level", "location"]))

    # def test_log_with_context(self):
