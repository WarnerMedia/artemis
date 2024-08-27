import unittest
from unittest.mock import MagicMock

from engine.plugins.gitlab_repo_health.rules import BranchProtectionPullRequests
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
SERVICE_URL = "atom-git"
KEY = "test"
NUM_APPROVALS = 7


class TestBranchProtectionPullRequests(unittest.TestCase):
    def test_enforce_pull_requests(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {
            "push_access_levels": [
                {"access_level": 0, "access_level_description": "No one", "user_id": None, "group_id": None}
            ]
        }
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_missing_pull_requests(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {
            # No required signatures
        }
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_no_pull_requests(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {
            "push_access_levels": [
                {"access_level": 40, "access_level_description": "Maintainers", "user_id": None, "group_id": None},
            ]
        }
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_multiple_pull_requests(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {
            "push_access_levels": [
                {"access_level": 30, "access_level_description": "Admins", "user_id": None, "group_id": None},
                {"access_level": 40, "access_level_description": "Maintainers", "user_id": None, "group_id": None},
            ]
        }
        mock_gitlab.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH),
        )

    def test_config_min_approvals_equal(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"required_pull_request_reviews": {"required_approving_review_count": NUM_APPROVALS}}
        mock_gitlab.get_approvals = MagicMock(return_value=mock_response)

        config = {"min_approvals": NUM_APPROVALS}

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH, config),
        )

    def test_config_min_approvals_less_than(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"required_pull_request_reviews": {"required_approving_review_count": NUM_APPROVALS}}
        mock_gitlab.get_approvals = MagicMock(return_value=mock_response)

        config = {"min_approvals": NUM_APPROVALS + 1}

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH, config),
        )

    def test_config_min_approvals_greater_than(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"required_pull_request_reviews": {"required_approving_review_count": NUM_APPROVALS}}
        mock_gitlab.get_approvals = MagicMock(return_value=mock_response)

        config = {"min_approvals": NUM_APPROVALS - 1}

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH, config),
        )

    def test_config_expect_field_exists_and_is_equal(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"required_pull_request_reviews": {"exists": "this-should-be-the-same"}}
        mock_gitlab.get_approvals = MagicMock(return_value=mock_response)

        config = {"expect": {"exists": "this-should-be-the-same"}}

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": True,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH, config),
        )

    def test_config_expect_field_exists_but_is_not_equal(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"required_pull_request_reviews": {"exists": "this-is-not-the-same"}}
        mock_gitlab.get_approvals = MagicMock(return_value=mock_response)

        config = {"expect": {"exists": "this-is-different"}}

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH, config),
        )

    def test_config_expect_field_does_not_exist(self):
        mock_gitlab = Gitlab(KEY, SERVICE_URL)
        mock_response = {"required_pull_request_reviews": {"exists": True}}
        mock_gitlab.get_approvals = MagicMock(return_value=mock_response)

        config = {"expect": {"not-exists": True}}

        expected = {
            "id": BranchProtectionPullRequests.identifier,
            "name": BranchProtectionPullRequests.name,
            "description": BranchProtectionPullRequests.description,
            "pass": False,
        }

        self.assertEqual(
            expected,
            BranchProtectionPullRequests.check(mock_gitlab, OWNER, REPO, BRANCH, config),
        )
