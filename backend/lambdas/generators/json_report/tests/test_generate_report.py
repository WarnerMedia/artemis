import unittest
from datetime import datetime, timezone

from artemisdb.artemisdb.models import PluginResult, Scan
from json_report.results.configuration import get_configuration
from json_report.results.inventory import get_inventory
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.results.sbom import get_sbom
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

TEST_VERACODE_SBOM = PluginResult(
    plugin_name="Veracode SBOM",
    plugin_type="sbom",
    success=True,
    details=[],
    errors=["test error"],
    alerts=["test alert"],
    debug=["test debug"],
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
        expected_sbom = PluginResult(
            None,
            PluginErrors(
                ["test error"],
                ["test alert"],
                ["test debug"],
            ),
            True,
            None,
        )

        mock_scan = unittest.mock.MagicMock(side_effect=Scan())
        mock_scan.pluginresult_set.filter.return_value = [TEST_VERACODE_SBOM]
        sbom = get_sbom(mock_scan)
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


if __name__ == "__main__":
    unittest.main()
