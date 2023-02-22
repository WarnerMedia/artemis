from .helpers import (
    add_metadata,
    array_config_schema,
    evaluate_array_config,
    is_subdict_of,
)


class BranchStatusChecks:
    identifier = "branch_status_checks"
    name = "Branch - Require Status Checks"
    description = "Branch protection rule is enabled that requires status checks on pull requests"

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
            "checks": {
                "type": "object",
                "additionalProperties": False,
                "properties": {**array_config_schema},
            },
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        protection_config = github.get_branch_protection(owner, repo, branch)

        message = protection_config.get("message")
        if message:
            return add_metadata(False, BranchStatusChecks, config, error_message=message)

        checks_response = protection_config.get("required_status_checks")
        if checks_response:
            contexts = checks_response.get("contexts")

            if contexts == None:
                raise Exception(
                    'Unexpected response: "required_status_checks" exists but not "required_status_checks.contexts". The Github API may have changed'
                )

            expect = config.get("expect", {})
            expect_passing = is_subdict_of(expect, checks_response)

            checks_array_config = config.get("checks", {})
            checks_passing = evaluate_array_config(checks_array_config, lambda check: check in contexts)

            return add_metadata(expect_passing and checks_passing, BranchStatusChecks, config)
        else:
            return add_metadata(False, BranchStatusChecks, config)
