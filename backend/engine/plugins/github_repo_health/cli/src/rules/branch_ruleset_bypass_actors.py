from .helpers import add_metadata, severity_schema

from github import GithubException


class BranchRulesetBypassActors:
    identifier = "branch_ruleset_bypass_actors"
    name = "Branch Ruleset - Bypass Actors"
    description = "Requres that all branch ruleset bypass actors meet specified criteria"

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
            "allowed_bypass_actor_ids": {"type": "array", "items": {"type": "number"}},
            "allowed_bypass_actor_types": {"type": "array", "items": {"type": "string"}},
            "allowed_bypass_actor_modes": {"type": "array", "items": {"type": "string"}},
            "required_bypass_actor_ids": {"type": "array", "items": {"type": "number"}},
        },
    }

    @staticmethod
    def check(github, owner, repo, branch, config={}):
        try:
            ruleset_ids = _get_ruleset_ids(github, owner, repo, branch)

            if not ruleset_ids:
                return add_metadata(False, BranchRulesetBypassActors, config)

            rulesets = list(map(lambda id: github.get_repo_ruleset(owner, repo, id), ruleset_ids))
            passing = all(map(lambda ruleset: _check_ruleset(config, ruleset), rulesets))

            return add_metadata(passing, BranchRulesetBypassActors, config)

        except GithubException as e:
            return add_metadata(False, BranchRulesetBypassActors, config, error_message=e.data.get("message"))


def _get_ruleset_ids(github, owner, repo, branch):
    rules = github.get_branch_rules(owner, repo, branch)
    rulesets = set()

    for rule in rules:
        rulesets.add(rule.get("ruleset_id"))

    return list(rulesets)


def _check_ruleset(config, ruleset):
    allowed_ids = config.get("allowed_bypass_actor_ids")
    allowed_types = config.get("allowed_bypass_actor_types")
    allowed_modes = config.get("allowed_bypass_actor_modes")
    required_ids = config.get("required_bypass_actor_ids")

    allowed_ids_passing = _check_allowed_bypass_ids(allowed_ids, ruleset) if allowed_ids != None else True
    allowed_types_passing = _check_allowed_bypass_types(allowed_types, ruleset) if allowed_types != None else True
    allowed_modes_passing = _check_allowed_bypass_modes(allowed_modes, ruleset) if allowed_modes != None else True
    required_ids_passing = _check_required_bypass_ids(required_ids, ruleset) if required_ids != None else True

    return allowed_ids_passing and allowed_types_passing and allowed_modes_passing and required_ids_passing


def _check_allowed_bypass_ids(allowed_ids, ruleset):
    allowed_ids_set = set(allowed_ids)
    bypass_actors = ruleset.get("bypass_actors")

    return all(map(lambda actor: actor.get("actor_id") in allowed_ids_set, bypass_actors))


def _check_allowed_bypass_types(allowed_types, ruleset):
    allowed_types_set = set(allowed_types)
    bypass_actors = ruleset.get("bypass_actors")

    return all(map(lambda actor: actor.get("actor_type") in allowed_types_set, bypass_actors))


def _check_allowed_bypass_modes(allowed_modes, ruleset):
    allowed_modes_set = set(allowed_modes)
    bypass_actors = ruleset.get("bypass_actors")

    return all(map(lambda actor: actor.get("bypass_mode") in allowed_modes_set, bypass_actors))


def _check_required_bypass_ids(required_ids, ruleset):
    bypass_actors = ruleset.get("bypass_actors")
    actor_ids_set = set(map(lambda actor: actor.get("actor_id"), bypass_actors))

    return all(map(lambda required_id: required_id in actor_ids_set, required_ids))
