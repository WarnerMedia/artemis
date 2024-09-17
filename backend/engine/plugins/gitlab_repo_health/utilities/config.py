import base64
import json

from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from engine.plugins.gitlab_repo_health import rules
from jsonschema import exceptions, validate

default_config = {
    "name": "default",
    "version": "1.0.0",
    "rules": [
        {
            "type": rules.BranchProtectionCommitSigning.identifier,
            "id": "branch_commit_signing",
            "name": "Branch - Commit Signing",
            "description": "Branch protection rule is enabled to enforce commit signing",
        },
        {
            "type": rules.BranchProtectionPreventSecretFiles.identifier,
            "id": "branch_prevent_secret_files",
            "name": "Branch - Prevent Secret Files",
            "description": "Branch protection rule is enabled to prevent pushing secret files",
        },
        {
            "type": rules.BranchProtectionEnforceAdmins.identifier,
            "id": "branch_enforce_admins",
            "name": "Branch - Enforce Rules for Admins",
            "description": "Branch protection rule is enabled to enforce branch rules for admins",
        },
        {
            "type": rules.BranchProtectionCodeOwnerApproval.identifier,
            "id": "branch_enforce_codeowner_approval",
            "name": "Branch - Code Owner Approval",
            "description": "Branch protection rule is enabled to enforce code owner approvals",
        },
        {
            "type": rules.BranchProtectionPullRequests.identifier,
            "id": "branch_pull_requests",
            "name": "Branch - Pull Requests",
            "description": "Branch protection rule is enabled to require pull requests",
            "expect": {
                "merge_requests_author_approval": False,
                "reset_approvals_on_push": True,
                "merge_requests_disable_committers_approval": True,
                "disable_overriding_approvers_per_merge_request": True,
            },
            "min_approvals": 1,
        },
    ],
}


class Config:
    @staticmethod
    def default(verbose: bool = False):
        if verbose:
            print("[CONFIG] Getting default config")

        Config.validate(default_config)

        if verbose:
            print("[CONFIG] Default config loaded successfully")

        return default_config

    @staticmethod
    def from_file(path: str, verbose: bool = False):
        if verbose:
            print(f'[CONFIG] Getting config from file, "{path}"')

        with open(path, "r") as file:
            config = json.load(file)

            Config.validate(config)

            if verbose:
                print(f'[CONFIG] Config "{path}" loaded successfully')

            return config

    @staticmethod
    def from_gitlab(gitlab: Gitlab, repo_and_path: str, verbose: bool = False):
        owner, repo, path = _destructure_gitlab_file(repo_and_path)

        if verbose:
            print(f'[CONFIG] Getting config from GitLab repo "{owner}/{repo}", file "{path}"')
        branch = gitlab.get_default_branch(owner, repo)
        contents = gitlab.get_repository_content(owner, repo, branch, path)

        err_message = contents.get("message")
        if err_message:
            raise Exception(f"Failed to get GitLab config: {err_message}")

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
                    raise Exception("Failed to get GitLab config, no content returned.")
            else:
                raise Exception(
                    "Failed to get GitLab config, expected base64 encoding. GitLab's API might have changed"
                )
        else:
            raise Exception(f'Failed to get GitLab config, "{repo_and_path}" - Not a file')

    @staticmethod
    def validate(config: dict):
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

            rule_type = rule_config.get("type", "")

            if rule_type not in rules.rules_dict:
                raise Exception(f'Config failed validation. Unrecognized rule in config, "{rule_type}"')
            else:
                rule = rules.rules_dict.get(rule_type)

                try:
                    validate(instance=rule_config, schema=rule.config_schema)  # type: ignore
                except exceptions.ValidationError as err:
                    raise Exception(f'Config failed validation for rule, "{rule_type}"') from err


def _destructure_gitlab_file(repo_and_path: str):
    try:
        owner_and_repo, path = repo_and_path.split(":", 1)

        try:
            owner, repo = owner_and_repo.split("/", 1)
            return (owner, repo, path)
        except ValueError:
            raise Exception(f'Invalid repo, "{owner_and_repo}. Expected format is <owner>/<repo>') from None
    except ValueError:
        raise Exception(
            f'Invalid gitlab file, "{repo_and_path}". Expected format is <owner>/<repo>:<path-to-file>'
        ) from None
