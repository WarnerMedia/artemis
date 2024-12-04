import json
import os.path
import unittest

from engine.plugins.cfn_python_lint.main import main, parse_message

TEST_DIR = os.path.dirname(os.path.abspath(__file__))
TEST_CFN = os.path.join(TEST_DIR, "data", "cfn_template")

TEMPLATE_DIR = os.path.join(TEST_CFN, "templates")
NO_TEMPLATE_DIR = os.path.join(TEST_CFN, "no_templates")
ERROR_MESSAGE_JSON = os.path.join(TEST_CFN, "errors", "component_error.json")

TEMPLATE_EXPECTED_DETAILS = {
    "details": [
        {
            "filename": "example_1.yaml",
            "line": 804,
            "message": 'Duplicate found "EC2InstanceSGID" (line 804)',
            "severity": "medium",
            "type": "E0000",
        },
        {
            "filename": "example_1.yaml",
            "line": 828,
            "message": 'Duplicate found "EC2InstanceSGID" (line 828)',
            "severity": "medium",
            "type": "E0000",
        },
    ],
    "success": False,
}


class TestPluginCfnPythonLint(unittest.TestCase):
    def test_cfn_no_templates(self):
        self.maxDiff = None
        expected_result = {"details": [], "success": True}

        result = main(NO_TEMPLATE_DIR)
        self.assertEqual(expected_result, result)

    def test_cfn_templates(self):
        self.maxDiff = None

        result = main(TEMPLATE_DIR)
        self.assertEqual(TEMPLATE_EXPECTED_DETAILS, result)

    def test_parse_message_error(self):
        with open(ERROR_MESSAGE_JSON) as json_file:
            message = json.load(json_file)
        expected_result = "ERROR: expected a single document in the stream"
        result = parse_message(message)
        self.assertEqual(expected_result, result)

    def test_parse_message_string(self):
        message = TEMPLATE_EXPECTED_DETAILS["details"][0]["message"]
        result = parse_message(message)
        self.assertEqual(message, result)

    def test_parse_message_empty(self):
        expected_result = ""
        result = parse_message("")
        self.assertEqual(expected_result, result)
