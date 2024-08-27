import unittest
from unittest.mock import MagicMock

from engine.plugins.gitlab_repo_health.rules import BranchProtectionPreventSecretFiles
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
SERVICE_URL = "atom-git"
KEY = "test"


class TestBranchProtectionPreventSecretFiles(unittest.TestCase):
    def test_prevent_secret_files(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"prevent_secrets": True}
        mock_gitlab.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPreventSecretFiles.identifier,
            "name": BranchProtectionPreventSecretFiles.name,
            "description": BranchProtectionPreventSecretFiles.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionPreventSecretFiles.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_no_prevent_secret_files(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"prevent_secrets": False}
        mock_gitlab.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPreventSecretFiles.identifier,
            "name": BranchProtectionPreventSecretFiles.name,
            "description": BranchProtectionPreventSecretFiles.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPreventSecretFiles.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_missing_prevent_secret_files(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {}
        mock_gitlab.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPreventSecretFiles.identifier,
            "name": BranchProtectionPreventSecretFiles.name,
            "description": BranchProtectionPreventSecretFiles.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPreventSecretFiles.check(mock_gitlab, OWNER, REPO, BRANCH),
        )
