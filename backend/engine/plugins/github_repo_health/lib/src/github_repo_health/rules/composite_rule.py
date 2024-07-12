from .first_order_rules import first_order_rules_dict
from .helpers import add_metadata, severity_schema

all_rules = list(map(lambda rule: rule.config_schema, first_order_rules_dict.values()))
all_rules.append({"$ref": "#"})  # Recursive reference, to allow nested composite rules

rules_schemas = {
    "type": "array",
    "items": {"anyOf": all_rules},
}


class CompositeRule:
    identifier = "composite_rule"
    name = "Composite Rule - This should be overridden with an appropriate name"
    description = (
        "This is a composite rule, this should be overridden with an appropriate description in configuration files"
    )

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
            "subrules": {
                "type": "object",
                "properties": {
                    "all_of": rules_schemas,
                    "any_of": rules_schemas,
                    "none_of": rules_schemas,
                },
            },
        },
    }

    _checker = None

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        if CompositeRule._checker == None:
            # Loads Checker at first run to avoid circular import
            from utilities import Checker

            CompositeRule._checker = Checker(github, None)

        subrules = config.get("subrules", {})

        all_of_config = subrules.get("all_of")
        any_of_config = subrules.get("any_of")
        none_of_config = subrules.get("none_of")

        (all_of_results, all_of_errors) = _get_results_and_errors(all_of_config, owner, repo, branch)
        (any_of_results, any_of_errors) = _get_results_and_errors(any_of_config, owner, repo, branch)
        (none_of_results, none_of_errors) = _get_results_and_errors(none_of_config, owner, repo, branch)

        error_messages = list(all_of_errors)
        error_messages.extend(any_of_errors)
        error_messages.extend(none_of_errors)

        all_of_passing = all(all_of_results) or all_of_config == None
        any_of_passing = any(any_of_results) or any_of_config == None
        none_of_passing = (not any(none_of_results)) or none_of_config == None

        passing = all_of_passing and any_of_passing and none_of_passing

        non_none_error_messages = list(filter(lambda message: message != None, error_messages))
        combined_error_message = ", ".join(non_none_error_messages)

        return add_metadata(passing, CompositeRule, config, error_message=combined_error_message)


def _get_results_and_errors(rules_config, owner, repo, branch):
    if rules_config == None:
        return ([], [])

    checks = list(
        map(
            lambda rule_config: CompositeRule._checker.run_check(rule_config, owner, repo, branch),
            rules_config,
        )
    )

    results = list(map(lambda result: result.get("pass"), checks))
    errors = list(map(lambda result: _get_error_message(result), checks))

    return (results, errors)


def _get_error_message(result):
    error_msg = result.get("error_message")

    if error_msg:
        identifier = result.get("id")
        return f"{identifier}: {error_msg}"
    else:
        return None
