from requests import HTTPError
from ..helpers import add_metadata, severity_schema


class BranchProtectionRequirePullRequestApprovals:
    identifier = "branch_protection_require_pull_request_approvals"
    name = "Branch Protection - Require Pull Request Approvals"
    description = "Requires that a branch protection rule is enabled that requires pull request approvals"

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
            "expect": {"type": "object"},
            "min_approvals": {"type": "number"},
        },
    }

    @staticmethod
    def check(gitlab, owner, repo, _, config={}):
        try:
            protection_config = gitlab.get_approvals(owner, repo)
        except HTTPError as e:
            return add_metadata(
                False,
                BranchProtectionRequirePullRequestApprovals,
                config,
                error_message=str(e),
            )

        push_levels = protection_config.get("push_access_levels", [])

        if len(push_levels) == 1:
            access_level = push_levels[0]
            passing = access_level.get("access_level", 1) == 0
            return add_metadata(passing, BranchProtectionRequirePullRequestApprovals, config)
        else:
            return add_metadata(False, BranchProtectionRequirePullRequestApprovals, config)
