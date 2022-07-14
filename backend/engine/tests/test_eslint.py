import unittest

from engine.plugins.eslint.main import parse_details

TEST_ESLINT_OUTPUT_1 = [
    '[{"filePath":"/work/base/node/bad_javascript/CR789393.md.js","messages":[{"ruleId":null,'
    '"fatal":true,"severity":2,"message":"Parsing error: Unexpected token i","line":4,'
    '"column":14}],"errorCount":1,"warningCount":0,"fixableErrorCount":0,"fixableWarningCount":0,'
    '"source":"I am a message"}]',
    "",
]

TEST_ESLINT_OUTPUT_NO_ERRORS = [
    '[{"filePath":"/work/base/Gruntfile.js","messages":[],"errorCount":0,'
    '"warningCount":0,"fixableErrorCount":0,"fixableWarningCount":0},'
    '{"filePath":"/work/base/docroot/push-worker.js","messages":[],"errorCount":0,'
    '"warningCount":0,"fixableErrorCount":0,"fixableWarningCount":0},'
    '{"filePath":"/work/base/webroot/push-worker.js","messages":[],"errorCount":0,'
    '"warningCount":0,"fixableErrorCount":0,"fixableWarningCount":0}]',
    "",
]


TEST_EXPECTED_FINDINGS = [
    {
        "filename": "node/bad_javascript/CR789393.md.js",
        "line": 4,
        "message": "Parsing error: Unexpected token i",
        "severity": "medium",
        "type": "",
    }
]

ERROR_OUTPUT = "Eslint encountered an internal error"


class TestEslint(unittest.TestCase):
    def test_parse_results_empty_list(self):
        eslint_results = []
        output = parse_details(eslint_results, "/work/base/")
        self.assertEqual(True, not output)

    def test_parse_results_details_only(self):
        expected_output = TEST_EXPECTED_FINDINGS
        output = parse_details(TEST_ESLINT_OUTPUT_1, "/work/base/")
        self.assertCountEqual(expected_output, output)

    def test_parse_results_details_only_success(self):
        expected_output = True
        output = parse_details(TEST_ESLINT_OUTPUT_NO_ERRORS, "/work/base/")
        self.assertEqual(expected_output, not output)
