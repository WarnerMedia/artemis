from rules.helpers import (
    add_metadata,
    array_config_schema,
    evaluate_array_config,
    severity_schema,
)

from github import GithubException


class RepoActions:
    identifier = "repo_actions"
    name = "Repository - Github Actions are Configured Properly"
    description = "Github actions are configured according to the baseline"

    config_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"const": identifier},
            "id": {"type": "string"},
            "enabled": {"type": "boolean"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "severity": severity_schema,
            "expect_any_of": {
                "type": "array",
                "items": {
                    "type": "object",
                    "additionalProperties": False,
                    "properties": {
                        "enabled": {"type": "boolean"},
                        "allowed_actions": {"type": "string", "enum": ["all", "local_only", "selected"]},
                        "selected_actions": {
                            "type": "object",
                            "properties": {
                                "github_owned_allowed": {"type": "boolean"},
                                "verified_allowed": {"type": "boolean"},
                                "patterns_allowed": {
                                    "type": "object",
                                    "properties": {**array_config_schema},
                                },
                            },
                        },
                    },
                },
            },
        },
    }

    @staticmethod
    def check(github, owner, repo, branch=None, config={}):
        try:
            actions = github.get_actions_permissions_repository(owner, repo)
        except GithubException as e:
            return add_metadata(False, RepoActions, config, error_message=e.data.get("message"))

        config_expect_any_of = config.get("expect_any_of")
        passing = config_expect_any_of == None or any(
            map(
                lambda conf: RepoActions._eval_actions_response(github, owner, repo, conf, actions),
                config_expect_any_of,
            )
        )

        return add_metadata(passing, RepoActions, config)

    @staticmethod
    def _eval_actions_response(github, owner, repo, config, actions):
        config_enabled = config.get("enabled")
        config_allowed_actions = config.get("allowed_actions")
        config_selected_actions = config.get("selected_actions")

        response_enabled = actions.get("enabled")
        response_allowed_actions = actions.get("allowed_actions")

        enabled_pass = config_enabled == None or config_enabled == response_enabled
        allowed_actions_pass = config_allowed_actions == None or config_allowed_actions == response_allowed_actions

        if response_enabled and response_allowed_actions == "selected" and config_selected_actions:
            response_selected_actions = github.get_selected_actions_repository(owner, repo)
            selected_pass = RepoActions._eval_selected(config_selected_actions, response_selected_actions)

            return enabled_pass and allowed_actions_pass and selected_pass
        else:
            return enabled_pass and allowed_actions_pass

    @staticmethod
    def _eval_selected(config, response):
        config_github_owned = config.get("github_owned_allowed")
        config_verified = config.get("verified_allowed")
        config_patterns = config.get("patterns_allowed")

        response_github_owned = response.get("github_owned_allowed")
        response_verified = response.get("verified_allowed")
        response_patterns = response.get("patterns_allowed")

        github_owned_pass = config_github_owned == None or config_github_owned == response_github_owned
        verified_pass = config_verified == None or config_verified == response_verified
        patterns_pass = config_patterns == None or evaluate_array_config(
            config_patterns, lambda pattern: pattern in response_patterns
        )

        return github_owned_pass and verified_pass and patterns_pass
