import unittest
from unittest.mock import MagicMock

from engine.plugins.gitlab_repo_health.rules import BranchProtectionCommitSigning
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
SERVICE_URL = "atom-git"
KEY = "test"


class TestBranchProtectionCommitSigning(unittest.TestCase):
    def test_commit_signing(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"reject_unsigned_commits": True}
        mock_gitlab.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionCommitSigning.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_missing_commit_signing(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {
            # No required signatures
        }
        mock_gitlab.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionCommitSigning.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_no_commit_signing(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"reject_unsigned_commits": False}
        mock_gitlab.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionCommitSigning.check(mock_gitlab, OWNER, REPO, BRANCH),
        )
