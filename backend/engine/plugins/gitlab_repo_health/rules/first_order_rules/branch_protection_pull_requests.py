from requests import HTTPError

from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from ..helpers import add_metadata, severity_schema


class BranchProtectionRequirePullRequests:
    identifier = "branch_protection_require_pull_requests"
    name = "Branch Protection - Require Pull Requests"
    description = "Requires that a branch protection rule is enabled that requires pull requests"

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
            protection_config = gitlab.get_branch_protection(owner, repo, branch)
        except HTTPError as e:
            return add_metadata(
                False,
                BranchProtectionRequirePullRequests,
                config,
                error_message=str(e),
            )

        push_levels = protection_config.get("push_access_levels", [])

        if len(push_levels) == 1:
            access_level = push_levels[0]
            passing = access_level.get("access_level", 1) == 0
            return add_metadata(passing, BranchProtectionRequirePullRequests, config)
        else:
            return add_metadata(False, BranchProtectionRequirePullRequests, config)
