import io
import json
import unittest
from contextlib import redirect_stdout

from mock import MagicMock, patch

from engine.plugins.lib import utils
from engine.plugins.trufflehog import main as trufflehog

EXAMPLE_EMAIL = "email@example.com"


EXAMPLE_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/exampmle.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "abcdef01234567890abcdef01234567890abcdef",
                "email": EXAMPLE_EMAIL,
                "file": "example.py",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "URI",
    "DecoderName": "PLAIN",
    "Verified": False,
    "VerificationError": "i/o timeout",
    "Raw": "http://abc123:abc123@example.com:6379",
    "RawV2": "http://abc123:abc123@example.com:6379",
    "Redacted": "http://abc123:********@example.com:6379",
    "ExtraData": None,
    "StructuredData": None
}

EXAMPLE_LEGIT_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/exampmle.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "corned_beef_hash",
                "email": EXAMPLE_EMAIL,
                "file": "The Pacific Crest Trail",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1
            }
        }
    },
    "SourceID": 1,
    "SourceType": 7,
    "SourceName": "trufflehog - git",
    "DetectorType": 17,
    "DetectorName": "AWS API Key",
    "DecoderName": "PLAIN",
    "Verified": False,
    "VerificationError": "i/o timeout",
    "Raw": "YER' A STRING 'ARRY",
    "RawV2": "YER' A STRING 'ARRY",
    "Redacted": "YER A ****** 'ARRY",
    "ExtraData": None,
    "StructuredData": None
}

EXAMPLE_LOCKFILE_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/exampmle.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "1",
                "email": EXAMPLE_EMAIL,
                "file": "package.lock",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1
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
    "StructuredData": None
}

EXAMPLE_VENDOR_FINDING = {
    "SourceMetadata": {
        "Data": {
            "Git": {
                "link": "https://example.com/example/example/blob/abcdef01234567890abcdef01234567890abcdef/exampmle.py#L1",
                "repository": "https://example.com/example/example.git",
                "commit": "42",
                "email": EXAMPLE_EMAIL,
                "file": "vendor/home",
                "timestamp": "2021-01-01 00:00:00 +0000",
                "line": 1,
                "visibility": 1
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
    "StructuredData": None
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
        expected = '{"success": false, "details": [{"scrubbing": "bubbles"}], "event_info": {}}\n'

        self.assertEqual(actual, expected)

    @patch("engine.plugins.trufflehog.main.subprocess")
    def test_run_security_checker(self, subproc):
        test = f"{json.dumps(EXAMPLE_FINDING)}\n".encode('utf-8')
        mock_output = MagicMock()
        mock_output.stdout = test
        subproc.run.return_value = mock_output
        actual = trufflehog.run_security_checker(utils.CODE_DIRECTORY)
        expected = [ EXAMPLE_FINDING ]
        self.assertEqual(actual, expected)

    @patch("engine.plugins.trufflehog.main.SystemAllowList._load_al")
    def test_run_scrub_results(self, mock_load_al):
        mock_load_al.return_value = []

        test = [ EXAMPLE_LEGIT_FINDING, EXAMPLE_LOCKFILE_FINDING, EXAMPLE_VENDOR_FINDING ]
        actual = trufflehog.scrub_results(test)
        expected_type = EXAMPLE_LEGIT_FINDING.get("DetectorName").lower()
        expected1 = {
            "id": actual["results"][0]["id"],
            "filename": "The Pacific Crest Trail",
            "line": 1,
            "commit": "corned_beef_hash",
            "type": expected_type,
            "author": EXAMPLE_EMAIL,
            "author-timestamp": "2021-01-01 00:00:00 +0000",
        }
        expected_event = {actual["results"][0]["id"]: {"match": ["YER' A STRING 'ARRY"], "type": expected_type}}
        expected = {"results": [expected1], "event_info": expected_event}

        self.assertEqual(actual, expected)
