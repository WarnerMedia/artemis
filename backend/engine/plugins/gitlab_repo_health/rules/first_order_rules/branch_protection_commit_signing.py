from requests import HTTPError
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from ..helpers import add_metadata, severity_schema


class BranchProtectionCommitSigning:
    identifier = "branch_protection_commit_signing"
    name = "Branch Protection - Require Commit Signing"
    description = "Requires that a branch protection rule is enabled to enforce code signing"

    config_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"const": identifier},
            "id": {"type": "string"},
            "enabled": {"type": "boolean"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "docs_url": {"type": "string"},
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
                BranchProtectionCommitSigning,
                config,
                error_message=str(e),
            )

        passing = branch_rules.get("reject_unsigned_commits", False) is True
        return add_metadata(passing, BranchProtectionCommitSigning, config)
