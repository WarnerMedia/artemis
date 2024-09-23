import os.path
import unittest
from tempfile import TemporaryDirectory

import pytest

from processor.processor import get_api_key
from utils.git import _process_diff, get_last_commit_timestamp, git_pull
from utils.services import _get_services_from_file

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

SERVICES_FILE = os.path.join(TEST_DIR, "data", "services.json")


class TestGit(unittest.TestCase):
    def setUp(self) -> None:
        svcs = _get_services_from_file(SERVICES_FILE)
        if svcs is None:
            raise Exception("Failed to load services for test case")
        self.services = svcs.get("services")

    @pytest.mark.integtest
    def test_clone(self):
        test_repo = "https://github.com/turnerlabs/samlkeygen.git"
        with TemporaryDirectory() as working_dir:
            api_key = get_api_key(self.services["github"])
            git_pull(api_key, test_repo, working_dir)
            assert os.path.isfile(os.path.join(working_dir, "base/README.md"))

    def test_process_diff(self):
        diff_output = (
            "diff --git a/test_file b/test_file\nindex 05d8e28..9244197 100644\n--- a/test_file\n+++ b/test_file\n"
            "@@ -5 +5 @@ FROM python\n-RUN cat /dev/null\n+RUN echo foobar\n"
            "@@ -21,1 +20,0 @@ FROM python\n-RUN cat /dev/null\n"
            "@@ -41,2 +40,2 @@ FROM python\n-RUN cat /dev/null\n-RUN cat /dev/null\n+RUN echofoobar\n+RUN echofoobar\n"
        )
        expected = {"filename": "test_file", "lines": [[5, 5], [40, 41]]}
        actual = _process_diff(diff_output)
        self.assertEqual(expected, actual)

    def test_process_diff_new_file(self):
        diff_output = (
            "diff --git a/new_file b/new_file\nindex 05d8e28..9244197 100644\n--- a/new_file\n+++ b/new_file\n"
            "@@ -0,0 +1,2 @@\n+RUN cat /dev/null\n+RUN cat /dev/null\n"
        )
        expected = {"filename": "new_file", "lines": [[1, 2]]}
        actual = _process_diff(diff_output)
        self.assertEqual(expected, actual)

    @pytest.mark.integtest
    def test_git_log(self):
        test_repo = "https://github.com/turnerlabs/samlkeygen.git"
        with TemporaryDirectory() as working_dir:
            api_key = get_api_key(self.services.get("github"))
            git_pull(api_key, test_repo, working_dir)
            # call git log on cloned repo
            branch_last_commit_timestamp = get_last_commit_timestamp(working_dir)
            # if git log command passed, branch_last_commit_timestamp should not be None
            self.assertIsNotNone(branch_last_commit_timestamp)
