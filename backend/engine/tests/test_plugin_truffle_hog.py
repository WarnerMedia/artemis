import io
import unittest
from contextlib import redirect_stdout

from mock import MagicMock, patch

from engine.plugins.lib import utils
from engine.plugins.lib.secrets_common.enums import SecretValidity
from engine.plugins.truffle_hog import main as truffle_hog


class TestPluginTruffle_hog(unittest.TestCase):
    @patch("engine.plugins.truffle_hog.main.run_security_checker")
    @patch("engine.plugins.truffle_hog.main.scrub_results")
    def test_main(self, mock_scrub_results, mock_security_checker):
        test = {"results": [{"scrubbing": "bubbles"}], "event_info": {}}
        mock_scrub_results.return_value = test
        stdout = io.StringIO()
        with redirect_stdout(stdout):
            truffle_hog.main([])
        actual = stdout.getvalue()
        expected = '{"success": false, "details": [{"scrubbing": "bubbles"}], "event_info": {}}\n'

        self.assertEqual(actual, expected)

    @patch("engine.plugins.truffle_hog.main.subprocess")
    def test_run_security_checker(self, subproc):
        test = (
            b'{"branch": "master", "commit": "ab", "commitHash":"1", ' b'"date": "1-1-19", "diff": "changed_stuff"}\n'
        )
        mock_output = MagicMock()
        mock_output.stdout = test
        subproc.run.return_value = mock_output
        actual = truffle_hog.run_security_checker(utils.CODE_DIRECTORY)
        expected = [{"branch": "master", "commit": "ab", "commitHash": "1", "date": "1-1-19", "diff": "changed_stuff"}]
        self.assertEqual(actual, expected)

    @patch("engine.plugins.truffle_hog.main.SystemAllowList._load_al")
    def test_run_scrub_results(self, mock_load_al):
        mock_load_al.return_value = []
        data1 = {
            "path": "The Pacific Crest Trail",
            "branch": "main_library_branch",
            "commitHash": "corned_beef_hash",
            "stringsFound": ["YER' A STRING 'ARRY"],
            "reason": "AWS API Key",
            "diff": "@@ -1,1 0,1\n",
        }
        data2 = {
            "path": "package.lock",
            "branch": "master",
            "commitHash": "1",
            "stringsFound": ["This is the story of a string, who didn't make it into the output"],
            "reason": "pytest",
            "diff": "@@ -1,1 0,1\n",
        }

        data3 = {
            "path": "vendor/home",
            "branch": "pepsi",
            "commitHash": "42",
            "stringsFound": ["an off brand coke."],
            "reason": "pytest",
            "diff": "@@ -1,1 0,1\n",
        }

        def fake_commit_author(scan_path, commit):
            return ("test@example.com", "2020-01-01T00:00:00.000000+00:00")

        truffle_hog.commit_author = fake_commit_author
        test = [data1, data2, data3]
        actual = truffle_hog.scrub_results(test, ".")
        expected1 = {
            "id": actual["results"][0]["id"],
            "filename": "The Pacific Crest Trail",
            "line": 1,
            "commit": "corned_beef_hash",
            "type": "aws",
            "author": "test@example.com",
            "author-timestamp": "2020-01-01T00:00:00.000000+00:00",
            "validity": SecretValidity.UNKNOWN,
        }
        expected_event = {actual["results"][0]["id"]: {"match": ["YER' A STRING 'ARRY"], "type": "aws"}}
        expected = {"results": [expected1], "event_info": expected_event}

        self.assertEqual(actual, expected)
