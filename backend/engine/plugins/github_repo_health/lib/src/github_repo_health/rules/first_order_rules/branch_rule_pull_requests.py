from github import GithubException

from ..helpers import add_metadata, is_subdict_of, severity_schema

DESIRED_RULE_TYPE = "pull_request"


class BranchRulePullRequests:
    identifier = "branch_rule_pull_requests"
    name = "Branch Rule - Require Pull Requests"
    description = "Requires that a branch rule is enabled that requires pull requests"

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
            "expect": {"type": "object"},
            "min_approvals": {"type": "number"},
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        try:
            rules = github.get_branch_rules(owner, repo, branch)
        except GithubException as e:
            return add_metadata(
                False,
                BranchRulePullRequests,
                config,
                error_message=e.data.get("message"),
            )

        pull_request_rules = filter(lambda rule: rule.get("type") == DESIRED_RULE_TYPE, rules)

        passing = any(map(lambda rule: _check_rule(config, rule), pull_request_rules))

        return add_metadata(passing, BranchRulePullRequests, config)


def _check_rule(config, rule):
    parameters = rule.get("parameters", {})

    expect_config = config.get("expect", {})
    min_approvals_config = config.get("min_approvals", 0)

    expect_passing = is_subdict_of(expect_config, parameters)

    required_approvals = parameters.get("required_approving_review_count", 0)
    min_approvals_met = min_approvals_config <= required_approvals

    return expect_passing and min_approvals_met
