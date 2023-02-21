import unittest
from unittest.mock import MagicMock

from ...src.rules import BranchPullRequests
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"
NUM_APPROVALS = 7


class TestBranchPullRequests(unittest.TestCase):
    def test_no_required_pull_request_reviews(self):
        mock_github = Github(None)
        mock_response = {
            # No required_pull_request_reviews
        }
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH))

    def test_required_pull_request_reviews(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"omitted": True}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH))

    def test_config_min_approvals_equal(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"required_approving_review_count": NUM_APPROVALS}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        config = {"min_approvals": NUM_APPROVALS}

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_config_min_approvals_less_than(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"required_approving_review_count": NUM_APPROVALS}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        config = {"min_approvals": NUM_APPROVALS + 1}

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_config_min_approvals_greater_than(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"required_approving_review_count": NUM_APPROVALS}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        config = {"min_approvals": NUM_APPROVALS - 1}

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_config_expect_field_exists_and_is_equal(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"exists": "this-should-be-the-same"}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        config = {"expect": {"exists": "this-should-be-the-same"}}

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_config_expect_field_exists_but_is_not_equal(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"exists": "this-is-not-the-same"}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        config = {"expect": {"exists": "this-is-different"}}

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_config_expect_field_does_not_exist(self):
        mock_github = Github(None)
        mock_response = {"required_pull_request_reviews": {"exists": True}}
        mock_github.get_branch_protection = MagicMock(return_value=mock_response)

        config = {"expect": {"not-exists": True}}

        expected = {
            "type": BranchPullRequests.identifier,
            "name": BranchPullRequests.name,
            "description": BranchPullRequests.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchPullRequests.check(mock_github, OWNER, REPO, BRANCH, config))
