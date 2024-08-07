import unittest
from unittest.mock import MagicMock

from github_repo_health.rules import BranchProtectionCommitSigning
from github_repo_health.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestBranchProtectionCommitSigning(unittest.TestCase):
    def test_no_required_signatures(self):
        mock_github = Github(None)
        mock_response = {
            # No required signatures
        }
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionCommitSigning.check(mock_github, OWNER, REPO, BRANCH),
        )

    def test_required_signatures(self):
        mock_github = Github(None)
        mock_response = {"required_signatures": {"enabled": True}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionCommitSigning.check(mock_github, OWNER, REPO, BRANCH),
        )
