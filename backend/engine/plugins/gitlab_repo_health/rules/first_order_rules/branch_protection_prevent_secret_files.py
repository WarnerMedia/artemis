from requests import HTTPError
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from ..helpers import add_metadata, severity_schema


class BranchProtectionPreventSecretFiles:
    identifier = "branch_protection_prevent_secret_files"
    name = "Branch Protection - Prevent Secret Files"
    description = "Requires that a branch protection rule is enabled to prevent pushing secret files"

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
        },
    }

    @staticmethod
    def check(gitlab: Gitlab, owner: str, repo: str, branch: str, config={}):
        try:
            branch_rules = gitlab.get_branch_rules(owner, repo, branch)

        except HTTPError as e:
            return add_metadata(
                False,
                BranchProtectionPreventSecretFiles,
                config,
                error_message=str(e),
            )

        passing = branch_rules.get("prevent_secrets", "") is True
        return add_metadata(passing, BranchProtectionPreventSecretFiles, config)
