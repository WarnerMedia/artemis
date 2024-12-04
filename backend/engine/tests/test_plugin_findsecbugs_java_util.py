import os
import unittest

from engine.plugins.lib.findsecbugs_common import jar_util, parsing_util

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_JSON_OUTPUT = [
    "M S SQL: A prepared statement is generated from a nonconstant String in "
    "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
    ".getUpdateSessionStatement( "
    "Connection, String, SessionContext)   At JDBCSessionDataStore.java:[line 294]",
    "M S SQL: A prepared statement is generated from a nonconstant String in "
    "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
    ".getExpiredSessionsStatement(Connection, String, String, long)   At JDBCSessionDataStore.java:["
    "line 312]",
]

TEST_JSON_OUTPUT_2 = [
    "M S HRS: HTTP parameter directly written to HTTP header output in org.eclipse.jetty.server."
    "ResourceService.passConditionalHeaders(HttpServletRequest, HttpServletResponse, HttpContent)"
    "   At ResourceService.java:[line 548]"
]

EXPECTED_JSON_OUTPUT = [
    {
        "filename": "JDBCSessionDataStore.java",
        "message": "A prepared statement is generated from a nonconstant String in "
        "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
        ".getUpdateSessionStatement( Connection, String, SessionContext)",
        "line": 294,
        "type": "M S SQL",
    },
    {
        "filename": "JDBCSessionDataStore.java",
        "message": "A prepared statement is generated from a nonconstant String in "
        "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
        ".getExpiredSessionsStatement(Connection, String, String, long)",
        "line": 312,
        "type": "M S SQL",
    },
]

EXPECTED_JSON_OUTPUT_2 = [
    {
        "filename": "ResourceService.java",
        "message": "HTTP parameter directly written to HTTP "
        "header output in "
        "org.eclipse.jetty.server.ResourceService."
        "passConditionalHeaders(HttpServletRequest, "
        "HttpServletResponse, HttpContent)",
        "line": 548,
        "type": "M S HRS",
    }
]


class TestPluginFindSecBugsJavaUtil(unittest.TestCase):
    def test_parse_cli_output(self):
        result = parsing_util.parse_cli_output(TEST_JSON_OUTPUT)
        self.assertEqual(EXPECTED_JSON_OUTPUT, result)

    def test_jar_util_get_jar_list(self):
        expected_result = 1
        result = jar_util._get_jar_list(TEST_DIR)
        self.assertEqual(expected_result, len(result))

    def test_jar_util_parse_cli_result_unsuccessful(self):
        expected_result = []
        expected_result.extend(EXPECTED_JSON_OUTPUT)
        expected_result.extend(EXPECTED_JSON_OUTPUT_2)
        expected_success = False
        cli_results = [{"status": True, "output": TEST_JSON_OUTPUT}, {"status": True, "output": TEST_JSON_OUTPUT_2}]
        success, result = parsing_util.parse_cli_results(cli_results)
        self.assertEqual(expected_success, success)
        self.assertEqual(result, expected_result)

    def test_jar_util_parse_cli_result_successful(self):
        expected_result = []
        expected_success = True
        cli_results = [{"status": True, "output": []}, {"status": True, "output": []}]
        success, result = parsing_util.parse_cli_results(cli_results)
        self.assertEqual(expected_success, success)
        self.assertEqual(result, expected_result)
