import unittest
from unittest.mock import MagicMock, Mock

from github import GithubException

from ...src.rules import RepoActions
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

EXAMPLE_CONFIG = {
    "expect_any_of": [
        {"enabled": False},
        {"allowed_actions": "local_only"},
        {"allowed_actions": "selected", "selected_actions": {"github_owned_allowed": True}},
    ]
}


class TestRepoActions(unittest.TestCase):
    def test_error(self):
        err_msg = "Not Found"

        mock_github = Github(None)
        exception = GithubException(400, { 'message': err_msg })
        mock_github.get_actions_permissions_repository = Mock(side_effect=exception)

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": False,
            "error_message": err_msg,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH))

    def test_actions_disabled(self):
        mock_github = Github(None)
        mock_response = {
            "enabled": False,
        }
        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_response)

        config = {
            "expect_any_of": [
                {
                    "enabled": False,
                }
            ]
        }

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_allowed_actions_local_only(self):
        mock_github = Github(None)
        mock_response = {
            "allowed_actions": "local_only",
        }
        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_response)

        config = {
            "expect_any_of": [
                {
                    "allowed_actions": "local_only",
                }
            ]
        }

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_selected_actions_with_github_owned(self):
        mock_github = Github(None)
        mock_action_response = {
            "allowed_actions": "selected",
        }
        mock_selected_action_response = {"github_owned_allowed": True}

        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_action_response)
        mock_github.get_selected_actions_repository = MagicMock(return_value=mock_selected_action_response)

        config = {
            "expect_any_of": [{"allowed_actions": "selected", "selected_actions": {"github_owned_allowed": True}}]
        }

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, config))

    def test_example_config_actions_disabled(self):
        mock_github = Github(None)
        mock_action_response = {
            "enabled": False,
        }

        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_action_response)

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, EXAMPLE_CONFIG))

    def test_example_config_actions_all(self):
        mock_github = Github(None)
        mock_action_response = {
            "enabled": True,
            "allowed_actions": "all",
        }

        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_action_response)

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, EXAMPLE_CONFIG))

    def test_example_config_actions_local_only(self):
        mock_github = Github(None)
        mock_action_response = {
            "enabled": True,
            "allowed_actions": "local_only",
        }

        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_action_response)

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, EXAMPLE_CONFIG))

    def test_example_config_actions_selected_no_github_owned(self):
        mock_github = Github(None)
        mock_action_response = {
            "enabled": True,
            "allowed_actions": "selected",
        }
        mock_selected_action_response = {
            "github_owned_allowed": False,
            "verified_allowed": False,
            "patterns_allowed": [],
        }

        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_action_response)
        mock_github.get_selected_actions_repository = MagicMock(return_value=mock_selected_action_response)

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": False,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, EXAMPLE_CONFIG))

    def test_example_config_actions_selected_with_github_owned(self):
        mock_github = Github(None)
        mock_action_response = {
            "enabled": True,
            "allowed_actions": "selected",
        }
        mock_selected_action_response = {
            "github_owned_allowed": True,
            "verified_allowed": True,
            "patterns_allowed": [],
        }

        mock_github.get_actions_permissions_repository = MagicMock(return_value=mock_action_response)
        mock_github.get_selected_actions_repository = MagicMock(return_value=mock_selected_action_response)

        expected = {
            "id": RepoActions.identifier,
            "name": RepoActions.name,
            "description": RepoActions.description,
            "pass": True,
        }

        self.assertEqual(expected, RepoActions.check(mock_github, OWNER, REPO, BRANCH, EXAMPLE_CONFIG))
