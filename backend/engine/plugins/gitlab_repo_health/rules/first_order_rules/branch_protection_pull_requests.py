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

        access_level_met = BranchProtectionPullRequests.checkNoPushPermissions(protection_config)
        requirements_result = BranchProtectionPullRequests.checkFulfillsRequirements(requirements, approvals_config)
        min_approvals_met = BranchProtectionPullRequests.checkMinApprovalsMet(min_approvals, approval_rules, branch)

        passing = requirements_result and min_approvals_met and access_level_met
        return add_metadata(passing, BranchProtectionPullRequests, config)

    @staticmethod
    def checkNoPushPermissions(protection_config: dict) -> bool:
        push_levels = protection_config.get("push_access_levels", [])
        # The only access level should be the one that says no one has access.
        if len(push_levels) != 1:
            return False

        access_level = push_levels[0]
        return access_level.get("access_level", 1) == 0

    @staticmethod
    def checkFulfillsRequirements(requirements: dict, approvals_config) -> bool:
        # If we have requiremnts, but none are set in GitLab, we fail.
        if requirements and approvals_config is None:
            return False

        return is_subdict_of(requirements, approvals_config)

    @staticmethod
    def checkMinApprovalsMet(min_approvals: int, approval_rules, branch: str) -> bool:
        min_approvals_met = False
        # If no min approvals, we succeed.
        if min_approvals == 0:
            return True
        else:
            # If we need min approvals and there are no rules, we fail.
            if approval_rules is None:
                return False

            min_approvals_met = False
            branch_rules = []
            # Search through approval rules for ones that match this branch.
            for rule in approval_rules:
                for each_branch in rule.get("protected_branches"):
                    if (each_branch.get("name")) == branch:
                        branch_rules.append(rule)
            # Look through branch approval rules, and make sure at least one exists that meets our rule.
            for rule in branch_rules:
                if rule.get("approvals_required", 0) >= min_approvals:
                    min_approvals_met = True
                    break
        return min_approvals_met
