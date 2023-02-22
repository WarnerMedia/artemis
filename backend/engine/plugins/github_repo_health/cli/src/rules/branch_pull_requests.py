from .helpers import add_metadata, is_subdict_of


class BranchPullRequests:
    identifier = "branch_pull_requests"
    name = "Branch - Require Pull Requests"
    description = "Branch protection rule is enabled that requires pull requests"

    config_schema = {
        "type": "object",
        "additionalProperties": False,
        "properties": {
            "type": {"const": identifier},
            "id": {"type": "string"},
            "enabled": {"type": "boolean"},
            "name": {"type": "string"},
            "description": {"type": "string"},
            "expect": {"type": "object"},
            "min_approvals": {"type": "number"},
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        protection_config = github.get_branch_protection(owner, repo, branch)

        message = protection_config.get("message")
        if message:
            return add_metadata(False, BranchPullRequests, config, error_message=message)

        pulls_config = protection_config.get("required_pull_request_reviews")
        if pulls_config:
            requirements = config.get("expect", {})
            requirements_result = is_subdict_of(requirements, pulls_config)

            min_approvals = config.get("min_approvals", 0)
            actual_required_approvals = pulls_config.get("required_approving_review_count", 0)
            min_approvals_met = min_approvals <= actual_required_approvals

            return add_metadata(requirements_result and min_approvals_met, BranchPullRequests, config)
        else:
            return add_metadata(False, BranchPullRequests, config)
