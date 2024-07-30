from github import GithubException

from ..helpers import add_metadata, array_config_schema, evaluate_array_config, is_subdict_of, severity_schema

DESIRED_RULE_TYPE = "required_status_checks"


class BranchRuleStatusChecks:
    identifier = "branch_rule_status_checks"
    name = "Branch Rule - Require Status Checks"
    description = "Requires that a branch rule is enabled that requires status checks on pull requests"

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
            "checks": {
                "type": "object",
                "additionalProperties": False,
                "properties": {**array_config_schema},
            },
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        try:
            rules = github.get_branch_rules(owner, repo, branch)
        except GithubException as e:
            return add_metadata(
                False,
                BranchRuleStatusChecks,
                config,
                error_message=e.data.get("message"),
            )

        status_check_rules = filter(lambda rule: rule.get("type") == DESIRED_RULE_TYPE, rules)

        passing = any(map(lambda rule: _check_rule(config, rule), status_check_rules))
        return add_metadata(passing, BranchRuleStatusChecks, config)


def _check_rule(config, rule):
    parameters = rule.get("parameters", {})

    expect_config = config.get("expect", {})
    checks_array_config = config.get("checks", {})

    expect_passing = is_subdict_of(expect_config, parameters)

    required_status_checks = parameters.get("required_status_checks", [])
    contexts = list(map(lambda required_check: required_check.get("context"), required_status_checks))
    checks_passing = evaluate_array_config(checks_array_config, lambda check: check in contexts)

    return expect_passing and checks_passing
