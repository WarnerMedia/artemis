import unittest
from unittest.mock import MagicMock

from engine.plugins.gitlab_repo_health.rules import BranchProtectionCodeOwnerApproval
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
SERVICE_URL = "atom-git"
KEY = "test"

NO_STATUS_CHECKS_RESPONSE = {}


class TestBranchProtectionCodeOwnerApproval(unittest.TestCase):
    def test_no_codeowner_approval(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"code_owner_approval_required": False}
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCodeOwnerApproval.identifier,
            "name": BranchProtectionCodeOwnerApproval.name,
            "description": BranchProtectionCodeOwnerApproval.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionCodeOwnerApproval.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_codeowner_approval(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"code_owner_approval_required": True}
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCodeOwnerApproval.identifier,
            "name": BranchProtectionCodeOwnerApproval.name,
            "description": BranchProtectionCodeOwnerApproval.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionCodeOwnerApproval.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_missing_codeowner_approval(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {}
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionCodeOwnerApproval.identifier,
            "name": BranchProtectionCodeOwnerApproval.name,
            "description": BranchProtectionCodeOwnerApproval.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionCodeOwnerApproval.check(mock_gitlab, OWNER, REPO, BRANCH),
        )
