import boto3
from moto import mock_aws
import os
import tempfile
import unittest
from unittest.util import safe_repr

from engine.plugins.checkov.main import Results, run_checkov

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

CHECKOV_TEST_DIR1 = "data/checkov/findings"
CHECKOV_TEST_DIR2 = "data/checkov/nofindings"
CHECKOV_TEST_DIR3 = "data/checkov/nocheckov"

CHECKOV_EMPTY_RESPONSE = {"success": True, "truncated": False, "details": [], "errors": []}


@mock_aws
class TestCheckov(unittest.TestCase):
    def _assertContainsFinding(
        self,
        details: list[dict],
        type: str = "",
        filename: str = "",
        line: int = 0,
        message: str = "",
        severity: str = "",
    ):
        """
        Checks if a finding is present in the list of findings.

        We anticipate that Checkov may report the findings in any order or
        change details of the message (e.g. to fix typos or to update the URL).

        The message is only matched to the error code (e.g. "CKV_AWS_144") since the
        message details may change from version to version but the code is expected
        to be stable.
        """
        for detail in details:
            if (
                detail["type"] == type
                and detail["filename"] == filename
                and detail["line"] == line
                and detail["severity"] == severity
                and detail["message"].startswith(f"{message} - ")
            ):
                return
        self.fail(
            "%s not found in %s"
            % (
                safe_repr(
                    {
                        "type": type,
                        "filename": filename,
                        "line": line,
                        "message": message,
                        "severity": severity,
                    }
                ),
                safe_repr(details),
            )
        )

    def _run_checkov(self, path: str, config: dict = {}) -> Results:
        """
        Call run_checkov on a working path.
        The working path must be an absolute path.
        """
        # A temporary directory is used in place of the named volume.
        # Since this directory is shared with the Checkov container, this
        # must be mounted with the same path as the host.
        with tempfile.TemporaryDirectory(prefix="artemis-checkov-test_") as tempdir:
            return run_checkov(path, tempdir, tempdir, path, path, config)

    def test_with_findings(self):
        response = self._run_checkov(f"{SCRIPT_DIR}/{CHECKOV_TEST_DIR1}")
        self.maxDiff = None
        self.assertTrue(response["success"])
        self.assertFalse(response["truncated"])
        self.assertEqual(response["errors"], [])

        details = response["details"]
        self.assertEqual(len(details), 4)
        self._assertContainsFinding(
            details,
            type="terraform",
            filename="main.tf",
            line=1,
            message="CKV_AWS_144",  # Ensure that S3 bucket has cross-region replication enabled
            severity="low",
        )
        self._assertContainsFinding(
            details,
            type="terraform",
            filename="main.tf",
            line=28,
            message="CKV_AWS_55",  # Ensure S3 bucket has ignore public ACLs enabled
            severity="medium",
        )
        self._assertContainsFinding(
            details,
            type="terraform",
            filename="main.tf",
            line=1,
            message="CKV2_AWS_62",  # Ensure S3 buckets should have event notifications enabled
            severity="low",
        )
        self._assertContainsFinding(
            details,
            type="terraform",
            filename="main.tf",
            line=1,
            message="CKV2_AWS_61",  # Ensure that an S3 bucket has a lifecycle configuration
            severity="low",
        )

    def test_without_findings(self):
        response = self._run_checkov(f"{SCRIPT_DIR}/{CHECKOV_TEST_DIR2}")
        self.assertEqual(response, CHECKOV_EMPTY_RESPONSE)

    def test_no_checkov(self):
        response = self._run_checkov(f"{SCRIPT_DIR}/{CHECKOV_TEST_DIR3}")
        self.assertEqual(response, CHECKOV_EMPTY_RESPONSE)

    def test_checkov_custom_config(self):
        """Tests running Checkov with a custom config"""
        cfg_dir = f"{SCRIPT_DIR}/data/checkov/custom/cfg"

        s3 = boto3.resource("s3")
        bucket = s3.create_bucket(Bucket="cfg")
        bucket.upload_file(f"{cfg_dir}/custom_sev.json", "checkov/custom_sev.json")
        bucket.upload_file(f"{cfg_dir}/rule.yaml", "checkov/subdir/rule.yaml")

        response = self._run_checkov(
            f"{SCRIPT_DIR}/data/checkov/custom/src",
            {
                "s3_config_path": "cfg/checkov",
                "severities_file": "custom_sev.json",
                "external_checks_dir": "subdir",
            },
        )

        self.assertEqual(response["errors"], [])

        details = response["details"]
        self._assertContainsFinding(
            details,
            type="terraform",
            filename="test.tf",
            line=1,
            message="ARTEMIS_TEST_RULE_000",
            severity="critical",
        )
        self._assertContainsFinding(
            details,
            type="terraform",
            filename="test.tf",
            line=1,
            message="CKV_AWS_166",
            severity="medium",  # Custom severity.
        )
