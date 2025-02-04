import copy
import unittest
from unittest.mock import ANY, patch

from engine.plugins.github_repo_health import main

GH_TOKEN = "example"
ORG = "example-org"
REPO = "example-repo"

CONFIG = {
    "name": "test_default",
    "version": "1.0.0",
    "rules": [
        {
            "type": "branch_commit_signing",
            "id": "github_branch_commit_signing",
        },
        {
            "type": "branch_enforce_admins",
            "id": "github_branch_enforce_admins",
        },
        {
            "type": "branch_pull_requests",
            "id": "github_branch_pull_requests",
            "expect": {
                "dismiss_stale_reviews": True,
                "require_code_owner_reviews": True,
            },
            "min_approvals": 1,
        },
        {
            "type": "branch_status_checks",
            "id": "github_branch_status_checks",
            "expect": {
                "strict": True,
            },
        },
    ],
}


class Args:
    def __init__(self, engine_vars, config):
        self.engine_vars = engine_vars
        self.config = config


ARGS_VALID = Args(
    {
        "service_name": "github",
        "repo": f"{ORG}/{REPO}",
        "ref": "main",
    },
    CONFIG,
)

ARGS_NOT_GITHUB = Args(
    {
        "service_name": "this-is-not-gh",
        "repo": f"{ORG}/{REPO}",
        "ref": "main",
    },
    CONFIG,
)

ARGS_NO_CONFIG = Args(
    {
        "service_name": "github",
        "repo": f"{ORG}/{REPO}",
        "ref": "main",
    },
    None,
)

CHECK_RESULT_ALL_SUCCEED = [
    {
        "id": "github_branch_commit_signing",
        "name": "Branch - Require Commit Signing",
        "description": "Branch protection rule is enabled to enforce code signing",
        "pass": True,
    },
    {
        "id": "github_branch_enforce_admins",
        "name": "Branch - Enforce Protection for Admins",
        "description": 'Branch protection rule, "Do not allow bypassing the above settings" is enabled. This enforces branch protection for admins',
        "pass": True,
    },
    {
        "id": "github_branch_pull_requests",
        "name": "Branch - Require Pull Requests",
        "description": "Branch protection rule is enabled that requires pull requests",
        "pass": True,
    },
    {
        "id": "github_branch_status_checks",
        "name": "Branch - Require Status Checks",
        "description": "Branch protection rule is enabled that requires status checks on pull requests",
        "pass": True,
    },
]

CHECK_RESULT_ALL_FAIL = copy.deepcopy(CHECK_RESULT_ALL_SUCCEED)
for check in CHECK_RESULT_ALL_FAIL:
    check["pass"] = False

CHECK_RESULT_ONE_FAIL = copy.deepcopy(CHECK_RESULT_ALL_SUCCEED)
CHECK_RESULT_ONE_FAIL[0]["pass"] = False

EVENT_INFO_ALL_SUCCEED = {}
for check in CHECK_RESULT_ALL_SUCCEED:
    EVENT_INFO_ALL_SUCCEED[check["id"]] = copy.deepcopy(check)
    EVENT_INFO_ALL_SUCCEED[check["id"]]["hash"] = "abc123"

EVENT_INFO_ALL_FAIL = copy.deepcopy(EVENT_INFO_ALL_SUCCEED)
for id in EVENT_INFO_ALL_FAIL:
    EVENT_INFO_ALL_FAIL[id]["pass"] = False

EVENT_INFO_ONE_FAIL = copy.deepcopy(EVENT_INFO_ALL_SUCCEED)
EVENT_INFO_ONE_FAIL["github_branch_commit_signing"]["pass"] = False


class TestPluginGithubRepoHealth(unittest.TestCase):
    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_everything_works(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        mock_github_app.return_value.get_installation_token.return_value = GH_TOKEN
        mock_checker.return_value.run.return_value = CHECK_RESULT_ALL_SUCCEED
        mock_get_client_from_token.return_value.get_branch_hash.return_value = "abc123"

        expected_result = {
            "success": True,
            "truncated": False,
            "details": CHECK_RESULT_ALL_SUCCEED,
            "errors": [],
            "alerts": [],
            "debug": [],
            "event_info": EVENT_INFO_ALL_SUCCEED,
        }
        result = main.run_repo_health(ARGS_VALID)

        self.assertEqual(expected_result, result)
        mock_checker.assert_called_once_with(ANY, CONFIG)

    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_service_is_not_github_and_it_returns_success_true(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        expected_result = {
            "success": True,
            "truncated": False,
            "details": [],
            "errors": [],
            "alerts": [],
            "debug": [],
            "event_info": {},
        }
        result = main.run_repo_health(ARGS_NOT_GITHUB)

        self.assertEqual(expected_result, result)

    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_results_all_pass_and_it_returns_success_true(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        mock_github_app.return_value.get_installation_token.return_value = GH_TOKEN
        mock_checker.return_value.run.return_value = CHECK_RESULT_ALL_SUCCEED
        mock_get_client_from_token.return_value.get_branch_hash.return_value = "abc123"

        expected_result = {
            "success": True,
            "truncated": False,
            "details": CHECK_RESULT_ALL_SUCCEED,
            "errors": [],
            "alerts": [],
            "debug": [],
            "event_info": EVENT_INFO_ALL_SUCCEED,
        }
        result = main.run_repo_health(ARGS_VALID)

        self.assertEqual(expected_result, result)

    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_results_one_fail_it_returns_success_false(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        mock_github_app.return_value.get_installation_token.return_value = GH_TOKEN
        mock_checker.return_value.run.return_value = CHECK_RESULT_ONE_FAIL
        mock_get_client_from_token.return_value.get_branch_hash.return_value = "abc123"

        expected_result = {
            "success": False,
            "truncated": False,
            "details": CHECK_RESULT_ONE_FAIL,
            "errors": [],
            "alerts": [],
            "debug": [],
            "event_info": EVENT_INFO_ONE_FAIL,
        }
        result = main.run_repo_health(ARGS_VALID)

        self.assertEqual(expected_result, result)

    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_results_all_fail_it_returns_success_false(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        mock_github_app.return_value.get_installation_token.return_value = GH_TOKEN
        mock_checker.return_value.run.return_value = CHECK_RESULT_ALL_FAIL
        mock_get_client_from_token.return_value.get_branch_hash.return_value = "abc123"

        expected_result = {
            "success": False,
            "truncated": False,
            "details": CHECK_RESULT_ALL_FAIL,
            "errors": [],
            "alerts": [],
            "debug": [],
            "event_info": EVENT_INFO_ALL_FAIL,
        }
        result = main.run_repo_health(ARGS_VALID)

        self.assertEqual(expected_result, result)

    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_github_token_fail_it_returns_with_error_message(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        mock_github_app.return_value.get_installation_token.return_value = None
        mock_checker.return_value.run.return_value = CHECK_RESULT_ALL_SUCCEED

        expected_result = {
            "success": False,
            "truncated": False,
            "details": [],
            "errors": ["Failed to authenticate to Github"],
            "alerts": [],
            "debug": [],
            "event_info": {},
        }
        result = main.run_repo_health(ARGS_VALID)

        self.assertEqual(expected_result, result)

    @patch.object(main.Github, "get_client_from_token")
    @patch.object(main.Config, "validate")
    @patch("engine.plugins.github_repo_health.main.Checker")
    @patch("engine.plugins.github_repo_health.main.GithubApp")
    def test_config_not_provided_it_uses_default_config(
        self,
        mock_github_app,
        mock_checker,
        mock_config_validate,
        mock_get_client_from_token,
    ):
        mock_github_app.return_value.get_installation_token.return_value = GH_TOKEN
        mock_checker.return_value.run.return_value = CHECK_RESULT_ALL_SUCCEED
        mock_get_client_from_token.return_value.get_branch_hash.return_value = "abc123"

        expected_result = {
            "success": True,
            "truncated": False,
            "details": CHECK_RESULT_ALL_SUCCEED,
            "errors": [],
            "alerts": [f"No config found for 'github/{ORG}/{REPO}'. Using default config"],
            "debug": [],
            "event_info": EVENT_INFO_ALL_SUCCEED,
        }
        result = main.run_repo_health(ARGS_NO_CONFIG)

        self.assertEqual(expected_result, result)
        mock_checker.assert_called_once_with(ANY, main.DEFAULT_CONFIG)
