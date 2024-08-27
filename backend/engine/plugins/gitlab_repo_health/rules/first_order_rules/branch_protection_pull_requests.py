from requests import HTTPError

from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from ..helpers import add_metadata, is_subdict_of, severity_schema


class BranchProtectionPullRequests:
    identifier = "branch_protection_pull_requests"
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
            "expect": {"type": "object"},
            "min_approvals": {"type": "number"},
        },
    }

    @staticmethod
    def check(gitlab: Gitlab, owner: str, repo: str, branch: str, config={}):
        min_approvals = config.get("min_approvals", 0)
        requirements = config.get("expect", {})
        approval_rules = []
        approvals_config = None
        try:
            protection_config = gitlab.get_branch_protection(owner, repo, branch)

            if requirements:
                approvals_config = gitlab.get_approvals(owner, repo)

            if min_approvals:
                approval_rules = gitlab.get_approval_rules(owner, repo)

        except HTTPError as e:
            return add_metadata(
                False,
                BranchProtectionPullRequests,
                config,
                error_message=str(e),
            )

        push_levels = protection_config.get("push_access_levels", [])

        if len(push_levels) != 1:
            return add_metadata(False, BranchProtectionPullRequests, config)

        if requirements and approvals_config is None:
            return add_metadata(False, BranchProtectionPullRequests, config)

        if min_approvals == 0:
            min_approvals_met = True
        else:
            if approval_rules is None:
                return add_metadata(False, BranchProtectionPullRequests, config)

            print(approval_rules)
            # get rules for this branch
            # make sure at least one rule is higher than the required number
            min_approvals_met = True

        requirements_result = is_subdict_of(requirements, approvals_config)

        access_level = push_levels[0]
        access_level_met = access_level.get("access_level", 1) == 0

        passing = requirements_result and min_approvals_met and access_level_met
        return add_metadata(passing, BranchProtectionPullRequests, config)
