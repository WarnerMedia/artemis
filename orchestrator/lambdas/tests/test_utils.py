import json
import unittest

from aws_lambda_powertools import Logger
from heimdall_utils import utils


log = Logger(__name__)


class TestUtils(unittest.TestCase):
    def setUp(self) -> None:
        self.json_utils = utils.JSONUtils(log)

    def test_get_json_from_response_text_None(self):
        text = None
        expected_result = None

        result = self.json_utils.get_json_from_response(text)

        self.assertEqual(expected_result, result)

    def test_get_json_from_response_success(self):
        test_dict = {"something": "else"}

        result = self.json_utils.get_json_from_response(json.dumps(test_dict))

        self.assertEqual(test_dict, result)
