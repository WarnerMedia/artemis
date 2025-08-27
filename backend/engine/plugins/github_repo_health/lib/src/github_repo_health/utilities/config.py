import base64
import json

from github_repo_health import rules
from jsonschema import exceptions, validate

default_config = {
    "name": "default",
    "version": "1.0.0",
    "rules": [
        {
            "type": rules.CompositeRule.identifier,
            "id": "branch_commit_signing",
            "name": "Branch - Commit Signing",
            "description": "Branch rule or branch protection rule is enabled to enforce commit signing",
            "subrules": {
                "any_of": [
                    {"type": rules.BranchProtectionCommitSigning.identifier},
                    {"type": rules.BranchRuleCommitSigning.identifier},
                ]
            },
        },
        {
            "type": rules.CompositeRule.identifier,
            "id": "branch_enforce_admins",
            "name": "Branch - Enforce Rules for Admins",
            "description": "Branch rule or branch protection rule is enabled to enforce branch rules for admins",
            "subrules": {
                "all_of": [
                    {
                        "type": rules.BranchProtectionEnforceAdmins.identifier,
                    },
                    {
                        "type": rules.BranchRulesetBypassActors.identifier,
                        "description": "There are no bypass actors allowed in branch rules",
                        "allowed_bypass_actor_ids": [],
                    },
                ]
            },
        },
        {
            "type": rules.CompositeRule.identifier,
            "id": "branch_pull_requests",
            "name": "Branch - Pull Request",
            "description": "Branch rule or branch protection rule is enabled to require pull requests",
            "subrules": {
                "any_of": [
                    {
                        "type": rules.BranchProtectionPullRequests.identifier,
                        "expect": {
                            "dismiss_stale_reviews": True,
                            "require_code_owner_reviews": True,
                        },
                        "min_approvals": 1,
                    },
                    {
                        "type": rules.BranchRulePullRequests.identifier,
                        "expect": {
                            "dismiss_stale_reviews_on_push": True,
                            "require_code_owner_review": True,
                        },
                        "min_approvals": 1,
                    },
                ]
            },
        },
        {
            "type": rules.CompositeRule.identifier,
            "id": "branch_status_checks",
            "name": "Branch - Status Checks",
            "description": "Branch rule or branch protection rule is enabled to require strict status checks",
            "subrules": {
                "any_of": [
                    {
                        "type": rules.BranchProtectionStatusChecks.identifier,
                        "expect": {
                            "strict": True,
                        },
                    },
                    {
                        "type": rules.BranchRuleStatusChecks.identifier,
                        "expect": {
                            "strict_required_status_checks_policy": True,
                        },
                    },
                ]
            },
        },
        {
            "type": rules.RepoActions.identifier,
            "expect_any_of": [
                {
                    "enabled": False,
                },
                {
                    "allowed_actions": "local_only",
                },
                {
                    "allowed_actions": "selected",
                },
            ],
        },
        {"type": rules.RepoCodeScanning.identifier},
        {"type": rules.RepoSecretScanning.identifier, "require_push_protection": True},
        {"type": rules.RepoSecurityAlerts.identifier},
    ],
}


class Config:
    @staticmethod
    def default(verbose=False):
        if verbose:
            print("[CONFIG] Getting default config")

        Config.validate(default_config)

        if verbose:
            print("[CONFIG] Default config loaded successfully")

        return default_config

    @staticmethod
    def from_file(path, verbose=False):
        if verbose:
            print(f'[CONFIG] Getting config from file, "{path}"')

        with open(path, "r") as file:
            config = json.load(file)

            Config.validate(config)

            if verbose:
                print(f'[CONFIG] Config "{path}" loaded successfully')

            return config

    @staticmethod
    def from_github(github, repo_and_path, verbose=False):
        owner, repo, path = _destructure_github_file(repo_and_path)

        if verbose:
            print(f'[CONFIG] Getting config from Github repo "{owner}/{repo}", file "{path}"')

        contents = github.get_repository_content(owner, repo, path)

        err_message = contents.get("message")
        if err_message:
            raise Exception(f"Failed to get Github config: {err_message}")

        if contents.get("type") == "file":
            if contents.get("encoding") == "base64":
                data = contents.get("content")
                if data:
                    result = json.loads(base64.b64decode(data))
                    Config.validate(result)

                    if verbose:
                        print(f'[CONFIG] Config "{repo_and_path}" loaded successfully')

                    return result
                else:
                    raise Exception("Failed to get Github config, no content returned.")
            else:
                raise Exception(
                    "Failed to get Github config, expected base64 encoding. Github's API might have changed"
                )
        else:
            raise Exception(f'Failed to get Github config, "{repo_and_path}" - Not a file')

    @staticmethod
    def validate(config):
        if type(config) is not dict:
            raise Exception("Config failed validation. Expected object")

        bad_rules_message = 'Config failed validation. Expected "rules" field that is an array of objects'

        if config.get("name") is None:
            raise Exception('Config failed validation. Expected top-level "name" field')
        if config.get("version") is None:
            raise Exception('Config failed validation. Expected top-level "version" field')

        rule_configs = config.get("rules")
        if type(rule_configs) is not list:
            raise Exception(bad_rules_message)

        for rule_config in rule_configs:
            if type(rule_config) is not dict:
                raise Exception(bad_rules_message)

            rule_type = rule_config.get("type")

            if rule_type not in rules.rules_dict:
                raise Exception(f'Config failed validation. Unrecognized rule in config, "{rule_type}"')
            else:
                rule = rules.rules_dict.get(rule_type)

                try:
                    validate(instance=rule_config, schema=rule.config_schema)
                except exceptions.ValidationError as err:
                    raise Exception(f'Config failed validation for rule, "{rule_type}"') from err


def _destructure_github_file(repo_and_path):
    try:
        owner_and_repo, path = repo_and_path.split(":", 1)

        try:
            owner, repo = owner_and_repo.split("/", 1)
            return (owner, repo, path)
        except ValueError:
            raise Exception(f'Invalid repo, "{owner_and_repo}. Expected format is <owner>/<repo>') from None
    except ValueError:
        raise Exception(
            f'Invalid github file, "{repo_and_path}". Expected format is <owner>/<repo>:<path-to-file>'
        ) from None
