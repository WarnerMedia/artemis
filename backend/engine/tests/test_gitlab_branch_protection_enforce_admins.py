import unittest
from unittest.mock import MagicMock

from engine.plugins.gitlab_repo_health.rules import BranchProtectionEnforceAdmins
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
SERVICE_URL = "atom-git"
KEY = "test"


class TestBranchProtectionEnforceAdmins(unittest.TestCase):
    def test_enforce_admins(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"allow_force_push": False}
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionEnforceAdmins.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_missing_enforce_admins(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {
            # No required signatures
        }
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionEnforceAdmins.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_no_enforce_admins(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"allow_force_push": True}
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionEnforceAdmins.identifier,
            "name": BranchProtectionEnforceAdmins.name,
            "description": BranchProtectionEnforceAdmins.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionEnforceAdmins.check(mock_gitlab, OWNER, REPO, BRANCH),
        )
