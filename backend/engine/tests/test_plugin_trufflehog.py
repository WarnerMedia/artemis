import copy
import io
import json
import unittest
from contextlib import redirect_stdout

from mock import MagicMock, patch

from engine.plugins.lib import utils
from engine.plugins.lib.secrets_common.enums import SecretValidity
from engine.plugins.trufflehog.detectors import verified_detectors_allowlist
from engine.plugins.trufflehog import main as trufflehog

EXAMPLE_EMAIL = "email@example.com"

EXAMPLE_UNKNOWN_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/example.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "abcdef01234567890abcdef01234567890abcdef",
                "email": EXAMPLE_EMAIL,
                "file": "example.py",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1,
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "Github",
    "DecoderName": "PLAIN",
    "Verified": False,
    "VerificationError": "i/o timeout",
    "Raw": "http://abc123:abc123@example.com:6379",
    "RawV2": "http://abc123:abc123@example.com:6379",
    "Redacted": "http://abc123:********@example.com:6379",
    "ExtraData": None,
    "StructuredData": None,
}

EXAMPLE_ACTIVE_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/example.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "corned_beef_hash",
                "email": EXAMPLE_EMAIL,
                "file": "The Pacific Crest Trail",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1,
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "Github",
    "DecoderName": "PLAIN",
    "Verified": True,
    "Raw": "YER' A STRING 'ARRY",
    "RawV2": "YER' A STRING 'ARRY",
    "Redacted": "YER A ****** 'ARRY",
    "ExtraData": None,
    "StructuredData": None,
}

EXAMPLE_INACTIVE_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/example.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "corned_beef_hash",
                "email": EXAMPLE_EMAIL,
                "file": "The Pacific Crest Trail",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1,
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "Github",
    "DecoderName": "PLAIN",
    "Verified": False,
    "Raw": "YER' A STRING 'ARRY",
    "RawV2": "YER' A STRING 'ARRY",
    "Redacted": "YER A ****** 'ARRY",
    "ExtraData": None,
    "StructuredData": None,
}

EXAMPLE_COMMIT_MESSAGE_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "commit": "corned_beef_hash",
                "email": EXAMPLE_EMAIL,
                "repository": "https://example.com/example/example.git",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 23,
            }
        }
    },
    "SourceID": 1,
    "SourceType": 16,
    "SourceName": "trufflehog - git",
    "DetectorType": 8,
    "DetectorName": "Github",
    "DecoderName": "PLAIN",
    "Verified": False,
    "Raw": "YER' A STRING 'ARRY",
    "RawV2": "YER' A STRING 'ARRY",
    "Redacted": "YER A ****** 'ARRY",
    "ExtraData": None,
    "StructuredData": None,
}

EXAMPLE_UNKNOWN_BECAUSE_NEVER_INACTIVE_FINDING = copy.deepcopy(EXAMPLE_INACTIVE_FINDING)
EXAMPLE_UNKNOWN_BECAUSE_NEVER_INACTIVE_FINDING["DetectorName"] = "PrivateKey"


EXAMPLE_LOCKFILE_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/example.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "1",
                "email": EXAMPLE_EMAIL,
                "file": "package.lock",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1,
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "pytest",
    "DecoderName": "PLAIN",
    "Verified": False,
    "VerificationError": "i/o timeout",
    "Raw": "This is the story of a string, who didn't make it into the output",
    "RawV2": "This is the story of a string, who didn't make it into the output",
    "Redacted": "This is the ***** of a string, who didn't make it into the ******",
    "ExtraData": None,
    "StructuredData": None,
}

EXAMPLE_VENDOR_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/example.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "42",
                "email": EXAMPLE_EMAIL,
                "file": "vendor/home",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1,
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "pytest",
    "DecoderName": "PLAIN",
    "Verified": False,
    "VerificationError": "i/o timeout",
    "Raw": "an off brand coke",
    "RawV2": "an off brand coke",
    "Redacted": "an off brand ****",
    "ExtraData": None,
    "StructuredData": None,
}


class TestPluginTrufflehog(unittest.TestCase):
    @patch("engine.plugins.trufflehog.main.run_security_checker")
    @patch("engine.plugins.trufflehog.main.scrub_results")
    def test_main(self, mock_scrub_results, mock_security_checker):
        test = {"results": [{"scrubbing": "bubbles"}], "event_info": {}}
        mock_scrub_results.return_value = test
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            trufflehog.main([])
        actual = stdout.getvalue()
        expected = '{"success": false, "details": [{"scrubbing": "bubbles"}], "event_info": {}, "errors": [], "alerts": [], "debug": []}\n'

        self.assertEqual(actual, expected)

    @patch("engine.plugins.trufflehog.main.subprocess")
    def test_run_security_checker(self, subproc):
        test = f"{json.dumps(EXAMPLE_UNKNOWN_FINDING)}\n".encode("utf-8")
        errors_dict = {
            "errors": [],
            "alerts": [],
            "debug": [],
        }

        mock_output = MagicMock()
        mock_output.stdout = test
        subproc.run.return_value = mock_output

        actual = trufflehog.run_security_checker(utils.CODE_DIRECTORY, errors_dict, verified=True)
        expected = [EXAMPLE_UNKNOWN_FINDING]

        self.assertEqual(actual, expected)

    @patch("engine.plugins.trufflehog.main.subprocess")
    def test_run_security_checker_verified_true(self, subproc):
        dummy_output = f"{json.dumps(EXAMPLE_UNKNOWN_FINDING)}\n".encode("utf-8")
        errors_dict = {
            "errors": [],
            "alerts": [],
            "debug": [],
        }

        mock_output = MagicMock()
        mock_output.stdout = dummy_output
        subproc.run.return_value = mock_output

        expected_param = "--include-detectors"
        expected_detectors = ",".join(verified_detectors_allowlist)

        trufflehog.run_security_checker(utils.CODE_DIRECTORY, errors_dict, verified=True)

        subproc_args = subproc.run.call_args.args
        cmd = subproc_args[0]

        self.assertIn(expected_param, cmd)
        self.assertIn(expected_detectors, cmd)

    @patch("engine.plugins.trufflehog.main.subprocess")
    def test_run_security_checker_verified_false(self, subproc):
        dummy_output = f"{json.dumps(EXAMPLE_UNKNOWN_FINDING)}\n".encode("utf-8")
        errors_dict = {
            "errors": [],
            "alerts": [],
            "debug": [],
        }

        mock_output = MagicMock()
        mock_output.stdout = dummy_output
        subproc.run.return_value = mock_output

        expected_param_1 = "--no-verification"
        expected_param_2 = "--exclude-detectors"
        expected_detectors = ",".join(verified_detectors_allowlist)

        trufflehog.run_security_checker(utils.CODE_DIRECTORY, errors_dict, verified=False)

        subproc_args = subproc.run.call_args.args
        cmd = subproc_args[0]

        self.assertIn(expected_param_1, cmd)
        self.assertIn(expected_param_2, cmd)
        self.assertIn(expected_detectors, cmd)

    @patch("engine.plugins.trufflehog.main.SystemAllowList._load_al")
    def test_run_scrub_results(self, mock_load_al):
        mock_load_al.return_value = []

        errors_dict = {
            "errors": [],
            "alerts": [],
            "debug": [],
        }
        test = [EXAMPLE_ACTIVE_FINDING, EXAMPLE_LOCKFILE_FINDING, EXAMPLE_VENDOR_FINDING]
        actual = trufflehog.scrub_results(test, errors_dict)

        expected_type = EXAMPLE_ACTIVE_FINDING.get("DetectorName", "").lower()
        expected1 = {
            "id": actual["results"][0]["id"],
            "filename": "The Pacific Crest Trail",
            "line": 1,
            "commit": "corned_beef_hash",
            "type": expected_type,
            "author": EXAMPLE_EMAIL,
            "author-timestamp": "2021-01-01 00:00:00 +0000",
            "validity": SecretValidity.ACTIVE,
        }
        expected_event = {actual["results"][0]["id"]: {"match": ["YER' A STRING 'ARRY"], "type": expected_type}}
        expected = {"results": [expected1], "event_info": expected_event}

        self.assertEqual(actual, expected)

    @patch("engine.plugins.trufflehog.main.SystemAllowList._load_al")
    def test_run_scrub_results_with_commit_message_finding(self, mock_load_al):
        mock_load_al.return_value = []

        errors_dict = {
            "errors": [],
            "alerts": [],
            "debug": [],
        }
        test = [EXAMPLE_COMMIT_MESSAGE_FINDING]
        actual = trufflehog.scrub_results(test, errors_dict)

        expected_type = EXAMPLE_COMMIT_MESSAGE_FINDING.get("DetectorName", "").lower()
        expected1 = {
            "id": actual["results"][0]["id"],
            "filename": "commit_message",
            "line": 0,
            "commit": "corned_beef_hash",
            "type": expected_type,
            "author": EXAMPLE_EMAIL,
            "author-timestamp": "2021-01-01 00:00:00 +0000",
            "validity": SecretValidity.INACTIVE,
        }
        expected_event = {actual["results"][0]["id"]: {"match": ["YER' A STRING 'ARRY"], "type": expected_type}}
        expected = {"results": [expected1], "event_info": expected_event}

        self.assertEqual(actual, expected)

    @patch("engine.plugins.trufflehog.main.SystemAllowList._load_al")
    def test_run_scrub_results_error(self, mock_load_al):
        mock_load_al.return_value = []

        errors_dict = {
            "errors": [],
            "alerts": [],
            "debug": [],
        }
        test = [
            {
                "SourceMetadata": {
                    "This is not an expected field": True,
                }
            }
        ]
        actual = trufflehog.scrub_results(test, errors_dict)

        expected = {"results": [], "event_info": {}}
        self.assertEqual(actual, expected)
        self.assertEqual(len(errors_dict["errors"]), 1)

    @patch("engine.plugins.trufflehog.main.SystemAllowList._load_al")
    def test_scrub_results_type_normalization(self, mock_load_al):
        mock_load_al.return_value = []

        type_normalization_table = {
            "PrivateKey": "ssh",
            "AWS": "aws",
            "AWSSessionKey": "aws",
            "MongoDB": "mongo",
            "Postgres": "postgres",
            "GoogleOauth2": "google",
            "GoogleApiKey": "google",
            "GCPApplicationDefaultCredentials": "google",
            "GCP": "google",
            "Redis": "redis",
            "Slack": "slack",
            "SlackWebhook": "slack",
        }

        for finding_type, expected in type_normalization_table.items():
            finding = _get_finding_from_type(finding_type)
            test = [finding]

            errors_dict = {
                "errors": [],
                "alerts": [],
                "debug": [],
            }

            result = trufflehog.scrub_results(test, errors_dict)

            actual = result["results"][0].get("type")

            self.assertEqual(actual, expected)

    def test_get_validity_active(self):
        expected = SecretValidity.ACTIVE
        actual = trufflehog.get_validity(EXAMPLE_ACTIVE_FINDING)

        self.assertEqual(actual, expected)

    def test_get_validity_inactive(self):
        expected = SecretValidity.INACTIVE
        actual = trufflehog.get_validity(EXAMPLE_INACTIVE_FINDING)

        self.assertEqual(actual, expected)

    def test_get_validity_unknown(self):
        expected = SecretValidity.UNKNOWN
        actual = trufflehog.get_validity(EXAMPLE_UNKNOWN_FINDING)

        self.assertEqual(actual, expected)

    def test_get_validity_unknown_because_never_inactive(self):
        expected = SecretValidity.UNKNOWN
        actual = trufflehog.get_validity(EXAMPLE_UNKNOWN_BECAUSE_NEVER_INACTIVE_FINDING)

        self.assertEqual(actual, expected)


def _get_finding_from_type(finding_type: str):
    finding = copy.deepcopy(EXAMPLE_UNKNOWN_FINDING)
    finding["DetectorName"] = finding_type

    return finding
