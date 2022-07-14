import os
import unittest

from engine.plugins.checkov.main import run_checkov

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

CHECKOV_TEST_DIR1 = "data/checkov/findings"
CHECKOV_TEST_DIR2 = "data/checkov/nofindings"
CHECKOV_TEST_DIR3 = "data/checkov/nocheckov"

CHECKOV_RESPONSE1 = {
    "success": True,
    "truncated": False,
    "details": [
        {
            "type": "terraform",
            "filename": "main.tf",
            "line": 1,
            "message": "CKV_AWS_144 - Ensure that S3 bucket has cross-region replication enabled - https://docs.bridgecrew.io/docs/ensure-that-s3-bucket-has-cross-region-replication-enabled",
            "severity": "low",
        },
        {
            "type": "terraform",
            "filename": "main.tf",
            "line": 28,
            "message": "CKV_AWS_55 - Ensure S3 bucket has ignore public ACLs enabled - https://docs.bridgecrew.io/docs/bc_aws_s3_21",
            "severity": "medium",
        },
    ],
    "errors": [],
}
CHECKOV_RESPONSE2 = {"success": True, "truncated": False, "details": [], "errors": []}


class TestCheckov(unittest.TestCase):
    def test_with_findings(self):
        response = run_checkov(f"{SCRIPT_DIR}/{CHECKOV_TEST_DIR1}")
        self.assertEqual(response, CHECKOV_RESPONSE1)

    def test_without_findings(self):
        response = run_checkov(f"{SCRIPT_DIR}/{CHECKOV_TEST_DIR2}")
        self.assertEqual(response, CHECKOV_RESPONSE2)

    def test_no_checkov(self):
        response = run_checkov(f"{SCRIPT_DIR}/{CHECKOV_TEST_DIR3}")
        self.assertEqual(response, CHECKOV_RESPONSE2)
