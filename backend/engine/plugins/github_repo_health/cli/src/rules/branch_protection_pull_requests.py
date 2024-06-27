from .helpers import add_metadata, is_subdict_of, severity_schema

from github import GithubException


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
    def check(github, owner, repo, branch, config={}):
        try:
            protection_config = github.get_branch_protection(owner, repo, branch)
        except GithubException as e:
            return add_metadata(False, BranchProtectionPullRequests, config, error_message=e.data.get("message"))

        pulls_config = protection_config.get("required_pull_request_reviews")

        if pulls_config:
            requirements = config.get("expect", {})
            requirements_result = is_subdict_of(requirements, pulls_config)

            min_approvals = config.get("min_approvals", 0)
            actual_required_approvals = pulls_config.get("required_approving_review_count", 0)
            min_approvals_met = min_approvals <= actual_required_approvals

            passing = requirements_result and min_approvals_met
            return add_metadata(passing, BranchProtectionPullRequests, config)
        else:
            return add_metadata(False, BranchProtectionPullRequests, config)
