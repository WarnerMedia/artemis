import unittest
from datetime import datetime, timezone

from artemisdb.artemisdb.models import PluginResult, Scan
from json_report.results.configuration import get_configuration
from json_report.results.inventory import get_inventory
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.results.sbom import get_sbom
from json_report.results.secret import get_secrets
from json_report.results.static_analysis import get_static_analysis
from json_report.util.const import DEFAULT_SCAN_QUERY_PARAMS

TEST_BRAKEMAN = PluginResult(
    plugin_name="Brakeman Scanner",
    plugin_type="static_analysis",
    success=False,
    details=[
        {
            "type": "Basic Auth",
            "message": "Basic authentication password stored in source code",
            "filename": "app/controllers/application_controller.rb",
            "line": 8,
            "severity": "",
        }
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=7, hour=16, minute=2, second=36, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=7, hour=16, minute=2, second=38, tzinfo=timezone.utc),
)

TEST_ESLINT = PluginResult(
    plugin_name="ESLint Static Scanner",
    plugin_type="static_analysis",
    success=False,
    details=[
        {
            "filename": "/work/base/node/bad_javascript/CR789393.md.js",
            "line": 4,
            "message": "Parsing error: Unexpected token i",
            "severity": "critical",
            "type": "",
        },
        {
            "filename": "/work/base/node/bad_javascript/CVE-2017-5088.md.js",
            "line": 12,
            "message": "Parsing error: Unexpected token >",
            "severity": "critical",
            "type": "",
        },
        {
            "filename": "/work/base/node/bad_javascript/CVE-2018-6142.md.js",
            "line": 4,
            "message": "Parsing error: The keyword 'const' is reserved",
            "severity": "critical",
            "type": "",
        },
        {
            "filename": "/work/base/node/bad_javascript/CVE-2018-6143.md.js",
            "line": 4,
            "message": "Parsing error: The keyword 'class' is reserved",
            "severity": "critical",
            "type": "",
        },
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=7, hour=19, minute=35, second=4, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=7, hour=19, minute=35, second=6, tzinfo=timezone.utc),
)

TEST_JAVA = PluginResult(
    plugin_name="FindSecBugs Scanner Java 8",
    plugin_type="static_analysis",
    success=True,
    errors=[],
    alerts=[],
    debug=[],
    details=[
        {
            "filename": "JDBCSessionDataStore.java",
            "message": "A prepared statement is generated from a nonconstant String in "
            "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
            ".getUpdateSessionStatement( Connection, String, SessionContext)",
            "line": "294",
            "type": "M S SQL",
        },
        {
            "filename": "JDBCSessionDataStore.java",
            "message": "A prepared statement is generated from a nonconstant String in org.eclipse.jetty.server.session"
            ".JDBCSessionDataStore$SessionTableSchema.getExpiredSessionsStatement(Connection, String, "
            "String, long)",
            "line": "312",
            "type": "M S SQL",
        },
    ],
)

TEST_NODEJSSCAN = PluginResult(
    plugin_name="Nodejsscan",
    plugin_type="static_analysis",
    success=False,
    details=[
        {
            "filename": "auth.json",
            "line": 5,
            "id": "/work/base/auth.json",
            "message": "A hardcoded password in plain text was identified.",
            "confidence": "",
            "severity": "",
            "type": "Password Hardcoded",
        }
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=7, hour=22, minute=35, second=39, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=7, hour=22, minute=35, second=46, tzinfo=timezone.utc),
)

TEST_PYLINT = PluginResult(
    plugin_name="Pylint Scanner",
    plugin_type="static_analysis",
    success=False,
    details=[
        {
            "filename": "python/pylint/example.py",
            "line": 1,
            "column": 0,
            "message-id": "W0611",
            "message": "Unused import json",
            "symbol": "unused-import",
        }
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=7, hour=23, minute=51, second=35, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=7, hour=23, minute=51, second=55, tzinfo=timezone.utc),
)

TEST_TSLINT = PluginResult(
    plugin_name="eslint",
    plugin_type="static_analysis",
    success=False,
    details=[
        {
            "filename": "TypeScript-React-Starter/class.tsx",
            "line": 23,
            "id": "",
            "message": "forbidden eval",
            "confidence": "",
            "severity": "medium",
            "type": "no-eval",
            "Version": "1.0",
        },
        {
            "filename": "TypeScript-React-Starter/src/actions/index.tsx",
            "line": 4,
            "id": "",
            "message": "Forbidden reference to reserved keyword: type",
            "confidence": "",
            "severity": "medium",
            "type": "no-reserved-keywords",
            "Version": "1.0",
        },
        {
            "filename": "TypeScript-React-Starter/src/actions/index.tsx",
            "line": 8,
            "id": "",
            "message": "Forbidden reference to reserved keyword: type",
            "confidence": "",
            "severity": "medium",
            "type": "no-reserved-keywords",
            "Version": "1.0",
        },
        {
            "filename": "typescript/class.tsx",
            "line": 23,
            "id": "",
            "message": "forbidden eval",
            "confidence": "",
            "severity": "medium",
            "type": "no-eval",
            "Version": "1.0",
        },
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=10, hour=17, minute=23, second=57, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=10, hour=17, minute=23, second=59, tzinfo=timezone.utc),
)

TEST_TECH_DISC = PluginResult(
    plugin_name="Technology Discovery",
    plugin_type="inventory",
    success=True,
    details={
        "technology_discovery": {
            "Ruby": 56.87,
            "Java": 32.85,
            "JavaScript": 4.66,
            "TypeScript": 4.08,
            "Shell": 0.95,
            "Python": 0.53,
            "Dockerfile": 0.05,
        }
    },
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)

TEST_BASE_IMAGES = PluginResult(
    plugin_name="Base Images",
    plugin_type="inventory",
    success=True,
    details={"base_images": {"python": ["latest", "3.7"], "golang": ["latest"]}},
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)

TEST_GITHUB_REPO_HEALTH = PluginResult(
    plugin_name="Github Repo Health",
    plugin_type="configuration",
    success=True,
    details=[
        {
            "id": "branch_commit_signing",
            "name": "Branch - Require Commit Signing",
            "description": "Branch protection rule is enabled to enforce code signing",
            "severity": "high",
            "pass": False,
        }
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)

secret_base_id = "01234567-89ab-cdef-0123-456789abcdef"


def get_secret_id(id):
    str_id = str(id)
    id_len = len(str_id)
    return f"{secret_base_id[0:-id_len]}{str_id}"


SECRET_FILE_1 = "secrets.txt"
SECRET_FILE_2 = "different-secrets.txt"
SECRET_COMMIT = "0123456789abcdef0123456789abcdef01234567"
SECRET_LINE = 1
SECRET_TYPE_1 = "type-1"
SECRET_TYPE_2 = "type-2"
SECRET_PARAMS = {
    "filter_diff": False,
    "secret": [
        SECRET_TYPE_1,
        SECRET_TYPE_2,
    ],
}
SECRET_PLUGIN_NAME = "Trufflehog"

TEST_SECRET_DEDUP = PluginResult(
    plugin_name=SECRET_PLUGIN_NAME,
    plugin_type="secrets",
    success=False,
    details=[
        {
            "id": get_secret_id(1),
            "filename": SECRET_FILE_1,
            "line": SECRET_LINE,
            "commit": SECRET_COMMIT,
            "type": SECRET_TYPE_1,
            "author": "jon.snow@example.com",
            "author-timestamp": "2020-01-01T00:00:00Z",
            "validity": "unknown",
        },
        {
            "id": get_secret_id(2),
            "filename": SECRET_FILE_1,
            "line": SECRET_LINE,
            "commit": SECRET_COMMIT,
            "type": SECRET_TYPE_2,
            "author": "jon.snow@example.com",
            "author-timestamp": "2020-01-01T00:00:00Z",
            "validity": "active",
        },
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)

TEST_SECRET_DEDUP_SAME_TYPE = PluginResult(
    plugin_name=SECRET_PLUGIN_NAME,
    plugin_type="secrets",
    success=False,
    details=[
        {
            "id": get_secret_id(1),
            "filename": SECRET_FILE_1,
            "line": SECRET_LINE,
            "commit": SECRET_COMMIT,
            "type": SECRET_TYPE_1,
            "author": "jon.snow@example.com",
            "author-timestamp": "2020-01-01T00:00:00Z",
            "validity": "unknown",
        },
        {
            "id": get_secret_id(2),
            "filename": SECRET_FILE_1,
            "line": SECRET_LINE,
            "commit": SECRET_COMMIT,
            "type": SECRET_TYPE_1,
            "author": "jon.snow@example.com",
            "author-timestamp": "2020-01-01T00:00:00Z",
            "validity": "active",
        },
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)

TEST_SECRET_MULTIPLE_FILES = PluginResult(
    plugin_name=SECRET_PLUGIN_NAME,
    plugin_type="secrets",
    success=False,
    details=[
        {
            "id": get_secret_id(1),
            "filename": SECRET_FILE_1,
            "line": SECRET_LINE,
            "commit": SECRET_COMMIT,
            "type": SECRET_TYPE_1,
            "author": "jon.snow@example.com",
            "author-timestamp": "2020-01-01T00:00:00Z",
            "validity": "active",
        },
        {
            "id": get_secret_id(2),
            "filename": SECRET_FILE_2,
            "line": SECRET_LINE,
            "commit": SECRET_COMMIT,
            "type": SECRET_TYPE_2,
            "author": "jon.snow@example.com",
            "author-timestamp": "2020-01-01T00:00:00Z",
            "validity": "inactive",
        },
    ],
    errors=[],
    alerts=[],
    debug=[],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)

SBOM_ERROR_MSG = "test error"
SBOM_ALERT_MSG = "test alert"
SBOM_DEBUG_MSG = "test debug message"

TEST_VERACODE_SBOM = PluginResult(
    plugin_name="Veracode SBOM",
    plugin_type="sbom",
    success=True,
    details=[],
    errors=[SBOM_ERROR_MSG],
    alerts=[SBOM_ALERT_MSG],
    debug=[SBOM_DEBUG_MSG],
    start_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=54, tzinfo=timezone.utc),
    end_time=datetime(year=2020, month=2, day=19, hour=15, minute=1, second=55, tzinfo=timezone.utc),
)


class TestGenerateReport(unittest.TestCase):
    def test_get_static_analysis_report_for_brakeman(self):
        expected_report = PLUGIN_RESULTS(
            {
                "app/controllers/application_controller.rb": [
                    {
                        "line": 8,
                        "type": "Basic Auth",
                        "message": "Basic authentication password stored in source code",
                        "severity": "",
                    }
                ]
            },
            PluginErrors(),
            False,
            {"critical": 0, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 1},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_BRAKEMAN]
        mock_scan.diff_base = None
        mock_scan.diff_compare = None
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_static_analysis_report_for_eslint(self):
        expected_report = PLUGIN_RESULTS(
            {
                "/work/base/node/bad_javascript/CR789393.md.js": [
                    {"line": 4, "message": "Parsing error: Unexpected token i", "severity": "critical", "type": ""}
                ],
                "/work/base/node/bad_javascript/CVE-2017-5088.md.js": [
                    {"line": 12, "message": "Parsing error: Unexpected token >", "severity": "critical", "type": ""}
                ],
                "/work/base/node/bad_javascript/CVE-2018-6142.md.js": [
                    {
                        "line": 4,
                        "message": "Parsing error: The keyword 'const' is reserved",
                        "severity": "critical",
                        "type": "",
                    }
                ],
                "/work/base/node/bad_javascript/CVE-2018-6143.md.js": [
                    {
                        "line": 4,
                        "message": "Parsing error: The keyword 'class' is reserved",
                        "severity": "critical",
                        "type": "",
                    }
                ],
            },
            PluginErrors(),
            False,
            {"critical": 4, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 0},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_ESLINT]
        mock_scan.diff_base = None
        mock_scan.diff_compare = None
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_static_analysis_report_for_nodejsscan(self):
        expected_report = PLUGIN_RESULTS(
            {
                "auth.json": [
                    {
                        "line": 5,
                        "message": "A hardcoded password in plain text was identified.",
                        "severity": "",
                        "type": "Password Hardcoded",
                    }
                ]
            },
            PluginErrors(),
            False,
            {"critical": 0, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 1},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_NODEJSSCAN]
        mock_scan.diff_base = None
        mock_scan.diff_compare = None
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_static_analysis_report_for_pylint(self):
        expected_report = PLUGIN_RESULTS(
            {"python/pylint/example.py": [{"line": 1, "message": "Unused import json", "severity": "", "type": ""}]},
            PluginErrors(),
            False,
            {"critical": 0, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 1},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_PYLINT]
        mock_scan.diff_base = None
        mock_scan.diff_compare = None
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_static_analysis_report_for_tslint(self):
        expected_report = PLUGIN_RESULTS(
            {
                "TypeScript-React-Starter/class.tsx": [
                    {"line": 23, "message": "forbidden eval", "severity": "medium", "type": "no-eval"}
                ],
                "TypeScript-React-Starter/src/actions/index.tsx": [
                    {
                        "line": 4,
                        "message": "Forbidden reference to reserved keyword: type",
                        "severity": "medium",
                        "type": "no-reserved-keywords",
                    },
                    {
                        "line": 8,
                        "message": "Forbidden reference to reserved keyword: type",
                        "severity": "medium",
                        "type": "no-reserved-keywords",
                    },
                ],
                "typescript/class.tsx": [
                    {"line": 23, "message": "forbidden eval", "severity": "medium", "type": "no-eval"}
                ],
            },
            PluginErrors(),
            False,
            {"critical": 0, "high": 0, "medium": 4, "low": 0, "negligible": 0, "": 0},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_TSLINT]
        mock_scan.diff_base = None
        mock_scan.diff_compare = None
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_static_analysis_report_for_findsecbugs_java(self):
        expected_report = PLUGIN_RESULTS(
            {
                "JDBCSessionDataStore.java": [
                    {
                        "line": "294",
                        "message": "A prepared statement is generated from a nonconstant String in "
                        "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
                        ".getUpdateSessionStatement( Connection, String, SessionContext)",
                        "severity": "",
                        "type": "M S SQL",
                    },
                    {
                        "line": "312",
                        "message": "A prepared statement is generated from a nonconstant String in "
                        "org.eclipse.jetty.server.session.JDBCSessionDataStore$SessionTableSchema"
                        ".getExpiredSessionsStatement(Connection, String, String, long)",
                        "severity": "",
                        "type": "M S SQL",
                    },
                ]
            },
            PluginErrors(),
            False,
            {"critical": 0, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 2},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_JAVA]
        mock_scan.diff_base = None
        mock_scan.diff_compare = None
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_secrets_dedup(self):
        # When multiple findings with different types are deduped, the returned type should be a
        # comma-separated list of the types of the original findings and an action equal to the
        # highest action of all findings
        expected_secrets = PLUGIN_RESULTS(
            {
                SECRET_FILE_1: [
                    {
                        "type": unittest.mock.ANY,
                        "line": SECRET_LINE,
                        "commit": SECRET_COMMIT,
                        "details": [
                            {
                                "type": SECRET_TYPE_1,
                                "validity": "unknown",
                                "source": SECRET_PLUGIN_NAME,
                                "location": None,
                            },
                            {
                                "type": SECRET_TYPE_2,
                                "validity": "active",
                                "source": SECRET_PLUGIN_NAME,
                                "location": None,
                            },
                        ],
                    }
                ],
            },
            PluginErrors(),
            False,
            1,
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.repo.allowlistitem_set.filter.return_value = []
        mock_scan.pluginresult_set.filter.return_value = [TEST_SECRET_DEDUP]

        secrets = get_secrets(mock_scan, SECRET_PARAMS)
        secret_type = secrets.findings[SECRET_FILE_1][0]["type"]

        self.assertEqual(expected_secrets, secrets)

        # Ensure that both secret types that were deduped show up in the new type
        self.assertIn(SECRET_TYPE_1, secret_type)
        self.assertIn(SECRET_TYPE_2, secret_type)

    def test_get_secrets_dedup_same_type(self):
        # When multiple findings with the same type are deduped, it should not repeat the type
        expected_secrets = PLUGIN_RESULTS(
            {
                SECRET_FILE_1: [
                    {
                        "type": SECRET_TYPE_1,
                        "line": SECRET_LINE,
                        "commit": SECRET_COMMIT,
                        "details": [
                            {
                                "type": SECRET_TYPE_1,
                                "validity": "unknown",
                                "source": SECRET_PLUGIN_NAME,
                                "location": None,
                            },
                            {
                                "type": SECRET_TYPE_1,
                                "validity": "active",
                                "source": SECRET_PLUGIN_NAME,
                                "location": None,
                            },
                        ],
                    }
                ],
            },
            PluginErrors(),
            False,
            1,
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.repo.allowlistitem_set.filter.return_value = []
        mock_scan.pluginresult_set.filter.return_value = [TEST_SECRET_DEDUP_SAME_TYPE]

        secrets = get_secrets(mock_scan, SECRET_PARAMS)

        self.assertEqual(expected_secrets, secrets)

    def test_get_secrets_do_not_dedup_different_files(self):
        # When multiple findings have the same line and commit, but different files, they should not
        # be deduped
        expected_secrets = PLUGIN_RESULTS(
            {
                SECRET_FILE_1: [
                    {
                        "type": SECRET_TYPE_1,
                        "line": SECRET_LINE,
                        "commit": SECRET_COMMIT,
                        "details": [
                            {
                                "type": SECRET_TYPE_1,
                                "validity": "active",
                                "source": SECRET_PLUGIN_NAME,
                                "location": None,
                            }
                        ],
                    }
                ],
                SECRET_FILE_2: [
                    {
                        "type": SECRET_TYPE_2,
                        "line": SECRET_LINE,
                        "commit": SECRET_COMMIT,
                        "details": [
                            {
                                "type": SECRET_TYPE_2,
                                "validity": "inactive",
                                "source": SECRET_PLUGIN_NAME,
                                "location": None,
                            }
                        ],
                    }
                ],
            },
            PluginErrors(),
            False,
            2,
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.repo.allowlistitem_set.filter.return_value = []
        mock_scan.pluginresult_set.filter.return_value = [TEST_SECRET_MULTIPLE_FILES]

        secrets = get_secrets(mock_scan, SECRET_PARAMS)

        self.assertEqual(expected_secrets, secrets)

    def test_get_inventory_report_for_technology_discovery(self):
        expected_inventory = PLUGIN_RESULTS(
            {
                "technology_discovery": {
                    "Dockerfile": 0.05,
                    "Java": 32.85,
                    "JavaScript": 4.66,
                    "Python": 0.53,
                    "Ruby": 56.87,
                    "Shell": 0.95,
                    "TypeScript": 4.08,
                },
                "base_images": {"python": ["latest", "3.7"], "golang": ["latest"]},
            },
            PluginErrors(),
            True,
            {"technology_discovery": 7, "base_images": 2},
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_TECH_DISC, TEST_BASE_IMAGES]
        inventory = get_inventory(mock_scan)
        self.assertEqual(expected_inventory, inventory)

    def test_get_configuration_report_for_github_repo_health(self):
        expected_configuration = PLUGIN_RESULTS(
            {
                "branch_commit_signing": {
                    "name": "Branch - Require Commit Signing",
                    "description": "Branch protection rule is enabled to enforce code signing",
                    "severity": "high",
                }
            },
            PluginErrors(),
            True,
            {"critical": 0, "high": 1, "medium": 0, "low": 0, "negligible": 0, "": 0},
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_GITHUB_REPO_HEALTH]
        configuration = get_configuration(mock_scan, DEFAULT_SCAN_QUERY_PARAMS)
        self.assertEqual(expected_configuration, configuration)

    def test_get_sbom_report_for_veracode_sbom(self):
        expected_sbom = PLUGIN_RESULTS(
            None,
            get_plugin_errors(
                TEST_VERACODE_SBOM.plugin_name, errors=[SBOM_ERROR_MSG], alerts=[SBOM_ALERT_MSG], debug=[SBOM_DEBUG_MSG]
            ),
            True,
            None,
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_VERACODE_SBOM]
        sbom = get_sbom(mock_scan)
        print("expected")
        print(expected_sbom.errors.errors)
        print(expected_sbom.errors.alerts)
        print(expected_sbom.errors.debug)
        print("real")
        print(sbom.errors.errors)
        print(sbom.errors.alerts)
        print(sbom.errors.debug)
        self.assertEqual(expected_sbom, sbom)

    def test_get_static_analysis_report_diff(self):
        expected_report = PLUGIN_RESULTS(
            {
                "/work/base/node/bad_javascript/CR789393.md.js": [
                    {"line": 4, "message": "Parsing error: Unexpected token i", "severity": "critical", "type": ""}
                ],
                "/work/base/node/bad_javascript/CVE-2017-5088.md.js": [
                    {"line": 12, "message": "Parsing error: Unexpected token >", "severity": "critical", "type": ""}
                ],
            },
            PluginErrors(),
            False,
            {"critical": 2, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 0},
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_ESLINT]
        mock_scan.diff_base = "deadbeef0123456789"
        mock_scan.diff_compare = "deadbeefAAAAAAAAAA"
        mock_scan.diff_summary = {
            "/work/base/node/bad_javascript/CR789393.md.js": [[4, 4]],
            "/work/base/node/bad_javascript/CVE-2017-5088.md.js": [[1, 20]],
        }
        self.run_static_analysis(mock_scan, expected_report)

    def test_get_static_analysis_report_diff_no_overlap(self):
        expected_report = PLUGIN_RESULTS(
            {}, PluginErrors(), True, {"critical": 0, "high": 0, "medium": 0, "low": 0, "negligible": 0, "": 0}
        )
        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_ESLINT]
        mock_scan.diff_base = "deadbeef0123456789"
        mock_scan.diff_compare = "deadbeefAAAAAAAAAA"
        mock_scan.diff_summary = {
            "/work/base/node/bad_javascript/CR789393.md.js": [[10, 20]],
            "/work/base/node/bad_javascript/CVE-2017-5088.md.js": [[1, 10]],
        }
        self.run_static_analysis(mock_scan, expected_report)

    def run_static_analysis(self, scan, expected_report):
        report = get_static_analysis(scan, DEFAULT_SCAN_QUERY_PARAMS)
        self.assertEqual(expected_report, report)


def get_plugin_errors(name, errors, alerts, debug):
    plugin_errors = PluginErrors()

    plugin_errors.errors[name] = errors
    plugin_errors.alerts[name] = alerts
    plugin_errors.debug[name] = debug

    return plugin_errors


if __name__ == "__main__":
    unittest.main()
