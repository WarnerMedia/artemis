from functools import cache
import os
import unittest

from engine.plugins.zizmor.report import (
    ConcreteLocation,
    ConcreteLocationLocation,
    Determinations,
    Finding,
    LocalKey,
    Location,
    Point,
    Report,
    SymbolicKey,
    SymbolicLocation,
)
from engine.plugins.zizmor.main import parse_scan, run
from engine.plugins.zizmor.results import StaticAnalysisFinding

TEST_DATA_DIR = os.path.dirname(os.path.abspath(__file__)) + "/data/zizmor"
REPORT_JSON = TEST_DATA_DIR + "/report.json"


@cache
def load_test_report() -> Report:
    """
    Load the test report from the JSON file.
    The result is cached.
    """
    with open(REPORT_JSON) as f:
        return Report.model_validate_json(f.read())


class TestPluginZizmorReport(unittest.TestCase):
    def test_parse_findings(self):
        report = load_test_report()
        self.assertEqual(
            report.root[0],
            Finding(
                desc="credential persistence through GitHub Actions artifacts",
                determinations=Determinations(severity="Medium"),
                locations=[
                    Location(
                        symbolic=SymbolicLocation(
                            annotation="does not set persist-credentials: false",
                            key=SymbolicKey(Local=LocalKey(given_path="/work/data/.github/workflows/ci.yml")),
                        ),
                        concrete=ConcreteLocation(
                            location=ConcreteLocationLocation(start_point=Point(row=14, column=8))
                        ),
                    ),
                ],
            ),
            Finding(
                desc="secrets referenced without a dedicated environment",
                determinations=Determinations(severity="High"),
                locations=[
                    Location(
                        symbolic=SymbolicLocation(
                            annotation="this job",
                            key=SymbolicKey(Local=LocalKey(given_path="/work/data/.github/workflows/progress.yml")),
                        ),
                        concrete=ConcreteLocation(
                            location=ConcreteLocationLocation(start_point=Point(row=27, column=2))
                        ),
                    ),
                    Location(
                        symbolic=SymbolicLocation(
                            annotation="secret is accessed outside of a dedicated environment",
                            key=SymbolicKey(Local=LocalKey(given_path="/work/data/.github/workflows/progress.yml")),
                        ),
                        concrete=ConcreteLocation(
                            location=ConcreteLocationLocation(start_point=Point(row=41, column=29))
                        ),
                    ),
                ],
            ),
        )


class TestPluginZizmor(unittest.TestCase):
    def test_parse_scan(self):
        report = load_test_report()
        findings = list(parse_scan(report, "/work/data/"))
        self.assertEqual(
            findings,
            [
                StaticAnalysisFinding(
                    filename=".github/workflows/ci.yml",
                    severity="medium",
                    message="does not set persist-credentials: false",
                    line=15,
                    type="credential persistence through GitHub Actions artifacts",
                ),
                StaticAnalysisFinding(
                    filename=".github/workflows/announce.yml",
                    severity="high",
                    message="secret is accessed outside of a dedicated environment",
                    line=42,
                    type="secrets referenced without a dedicated environment",
                ),
            ],
        )

    def test_run_empty(self):
        """Test that no error is indicated if no input files are found."""
        findings = list(run(f"{TEST_DATA_DIR}/empty/"))
        self.assertEqual(findings, [])

    def test_run_fatal(self):
        """Test that we handle fatal errors from Zizmor."""
        with self.assertRaises(Exception):
            # This should trigger a failure since we run in offline mode.
            list(run("zizmorcore/zizmor@main"))

    def test_run_config(self):
        """Test that the global config overrides any repo-supplied config."""
        findings = list(run(f"{TEST_DATA_DIR}/config/"))
        self.assertEqual(len(findings), 2)
        self.assertIn(
            StaticAnalysisFinding(
                filename=".github/dependabot.yml",
                severity="medium",
                message="missing cooldown configuration",
                line=4,
                type="insufficient cooldown in Dependabot updates",
            ),
            findings,
        )
        self.assertIn(
            StaticAnalysisFinding(
                filename=".github/dependabot.yml",
                severity="low",
                message="insufficient default-days configured (less than 1)",
                line=19,
                type="insufficient cooldown in Dependabot updates",
            ),
            findings,
        )
        # This should not appear since the test-data zizmor.yml should be ignored.
        self.assertNotIn(
            StaticAnalysisFinding(
                filename=".github/dependabot.yml",
                severity="low",
                message="insufficient default-days configured (less than 20)",
                line=13,
                type="insufficient cooldown in Dependabot updates",
            ),
            findings,
        )

    def test_run_normal(self):
        findings = list(run(f"{TEST_DATA_DIR}/example/"))
        self.assertIn(
            StaticAnalysisFinding(
                filename=".github/workflows/test.yml",
                severity="medium",
                message="default permissions used due to no permissions: block",
                line=9,
                type="overly broad permissions",
            ),
            findings,
        )
        self.assertIn(
            StaticAnalysisFinding(
                filename=".github/workflows/test.yml",
                severity="high",
                message="action is not pinned to a hash (required by blanket policy)",
                line=14,
                type="unpinned action reference",
            ),
            findings,
        )
        # This finding should be omitted since it is a low confidence.
        self.assertNotIn(
            StaticAnalysisFinding(
                filename=".github/workflows/test.yml",
                severity="low",
                message="does not set persist-credentials: false",
                line=13,
                type="credential persistence through GitHub Actions artifacts",
            ),
            findings,
        )


if __name__ == "__main__":
    unittest.main()
