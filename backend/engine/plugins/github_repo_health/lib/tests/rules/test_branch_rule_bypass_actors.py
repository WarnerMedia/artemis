import pytest
from unittest.mock import MagicMock

from github_repo_health.rules import BranchRulesetBypassActors
from github_repo_health.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

ROLE_ACTOR = {"actor_id": 1, "actor_type": "RepositoryRole", "bypass_mode": "always"}
APP_ACTOR = {"actor_id": 2, "actor_type": "Integration", "bypass_mode": "pull_request"}
TEAM_ACTOR = {"actor_id": 3, "actor_type": "Team", "bypass_mode": "always"}


def test_branch_rules_empty():
    mock_github = Github(None)

    mock_branch_rules_response = []
    mock_github.get_branch_rules = MagicMock(return_value=mock_branch_rules_response)

    expected = {
        "id": BranchRulesetBypassActors.identifier,
        "name": BranchRulesetBypassActors.name,
        "description": BranchRulesetBypassActors.description,
        "pass": True,
    }

    assert expected == BranchRulesetBypassActors.check(mock_github, OWNER, REPO, BRANCH)


@pytest.mark.parametrize(
    "config,bypass_actors,expected_pass",
    [
        pytest.param(
            {},
            [],
            True,
            id="should pass if nothing specified in config and no bypass actors",
        ),
        pytest.param(
            {},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            True,
            id="should pass if nothing specified in config and there are many bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": []},
            [],
            True,
            id="should pass if it allow no actor ids and there are no bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": []},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            False,
            id="should fail if it allows no actor ids and there are many bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            False,
            id="should fail if it allows a single actor id and that same id is a bypass actor with additional bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            [ROLE_ACTOR],
            True,
            id="should pass if it allows a single actor id and that same id is a bypass actor",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_ids": [
                    ROLE_ACTOR.get("actor_id"),
                    APP_ACTOR.get("actor_id"),
                    TEAM_ACTOR.get("actor_id"),
                ]
            },
            [],
            True,
            id="should pass if it allows multiple actor ids and there are no bypass actors",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_ids": [
                    ROLE_ACTOR.get("actor_id"),
                    APP_ACTOR.get("actor_id"),
                    TEAM_ACTOR.get("actor_id"),
                ]
            },
            [ROLE_ACTOR],
            True,
            id="should pass if it allows multiple actor ids and the only bypass actor is one of them",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_ids": [
                    ROLE_ACTOR.get("actor_id"),
                    APP_ACTOR.get("actor_id"),
                    TEAM_ACTOR.get("actor_id"),
                ]
            },
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            True,
            id="should pass if it allows multiple actor ids and they are all also bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_types": []},
            [],
            True,
            id="should pass if it allow no actor types and there are no bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_types": []},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            False,
            id="should fail if it allows no actor types and there are bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_types": [ROLE_ACTOR.get("actor_type")]},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            False,
            id="should fail if it allows a single actor type and there are bypass actors that are not of that type",
        ),
        pytest.param(
            {"allowed_bypass_actor_types": [ROLE_ACTOR.get("actor_type")]},
            [ROLE_ACTOR],
            True,
            id="should pass if it allows a single actor type and the only bypass actor is of that type",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_types": [
                    ROLE_ACTOR.get("actor_type"),
                    APP_ACTOR.get("actor_type"),
                    TEAM_ACTOR.get("actor_type"),
                ]
            },
            [],
            True,
            id="should pass if it allows multiple actor types and there are no bypass actors",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_types": [
                    ROLE_ACTOR.get("actor_type"),
                    APP_ACTOR.get("actor_type"),
                    TEAM_ACTOR.get("actor_type"),
                ]
            },
            [ROLE_ACTOR],
            True,
            id="should pass if it allows multiple actor types and the only bypass actor's type is of one of them",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_types": [
                    ROLE_ACTOR.get("actor_type"),
                    APP_ACTOR.get("actor_type"),
                    TEAM_ACTOR.get("actor_type"),
                ]
            },
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            True,
            id="should pass if it allows multiple actor types and there is a bypass actor of each type",
        ),
        pytest.param(
            {"allowed_bypass_actor_modes": []},
            [],
            True,
            id="should pass if it allow no bypass modes and there are no bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_modes": []},
            [ROLE_ACTOR, APP_ACTOR],
            False,
            id="should fail if it allows no bypass modes and there are bypass actors",
        ),
        pytest.param(
            {"allowed_bypass_actor_modes": [ROLE_ACTOR.get("bypass_mode")]},
            [ROLE_ACTOR, APP_ACTOR],
            False,
            id="should fail if it allows a single bypass mode and there are bypass actors that are not of that mode",
        ),
        pytest.param(
            {"allowed_bypass_actor_modes": [ROLE_ACTOR.get("bypass_mode")]},
            [ROLE_ACTOR],
            True,
            id="should pass if it allows a single bypass mode and the only bypass actor is of that mode",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_modes": [
                    ROLE_ACTOR.get("bypass_mode"),  # Role actor's mode is always
                    APP_ACTOR.get("bypass_mode"),  # App actor's mode is pull_request
                ]
            },
            [],
            True,
            id="should pass if it allows multiple bypass modes and there are no bypass actors",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_modes": [
                    ROLE_ACTOR.get("bypass_mode"),  # Role actor's mode is always
                    APP_ACTOR.get("bypass_mode"),  # App actor's mode is pull_request
                ]
            },
            [ROLE_ACTOR],
            True,
            id="should pass if it allows multiple bypass modes and the only bypass actor's mode is of one of them",
        ),
        pytest.param(
            {
                "allowed_bypass_actor_modes": [
                    ROLE_ACTOR.get("bypass_mode"),  # Role actor's mode is always
                    APP_ACTOR.get("bypass_mode"),  # App actor's mode is pull_request
                ]
            },
            [ROLE_ACTOR, APP_ACTOR],
            True,
            id="should pass if it allows multiple bypass modes and there is a bypass actor of each mode",
        ),
        pytest.param(
            {"required_bypass_actor_ids": []},
            [],
            True,
            id="should pass if it requires no actor ids and there are no bypass actors",
        ),
        pytest.param(
            {"required_bypass_actor_ids": []},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            True,
            id="should pass if it requires no actor ids and there are many bypass actors",
        ),
        pytest.param(
            {"required_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            [],
            False,
            id="should fail if it requires an actor id and it is not a bypass actor",
        ),
        pytest.param(
            {"required_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            [ROLE_ACTOR],
            True,
            id="should pass if it requires an actor id and it is the only bypass actor",
        ),
        pytest.param(
            {"required_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            True,
            id="should pass if it requires an actor id and it is one of many bypass actors",
        ),
        pytest.param(
            {
                "required_bypass_actor_ids": [
                    ROLE_ACTOR.get("actor_id"),
                    APP_ACTOR.get("actor_id"),
                    TEAM_ACTOR.get("actor_id"),
                ]
            },
            [],
            False,
            id="should fail if it requires multiple actor ids and none of them are bypass actors",
        ),
        pytest.param(
            {
                "required_bypass_actor_ids": [
                    ROLE_ACTOR.get("actor_id"),
                    APP_ACTOR.get("actor_id"),
                    TEAM_ACTOR.get("actor_id"),
                ]
            },
            [ROLE_ACTOR],
            False,
            id="should fail if it requires multiple actor ids and only one of them is a bypass actor",
        ),
        pytest.param(
            {
                "required_bypass_actor_ids": [
                    ROLE_ACTOR.get("actor_id"),
                    APP_ACTOR.get("actor_id"),
                    TEAM_ACTOR.get("actor_id"),
                ]
            },
            [ROLE_ACTOR, APP_ACTOR, TEAM_ACTOR],
            True,
            id="should pass if it requires multiple actor ids and they are all bypass actors",
        ),
    ],
)
def test_bypass_actors(config, bypass_actors, expected_pass):
    mock_github = Github(None)

    mock_branch_rules_response = [{"ruleset_id": 1}]
    mock_github.get_branch_rules = MagicMock(return_value=mock_branch_rules_response)

    mock_ruleset_response = {
        "bypass_actors": bypass_actors,
    }
    mock_github.get_repo_ruleset = MagicMock(return_value=mock_ruleset_response)

    expected = {
        "id": BranchRulesetBypassActors.identifier,
        "name": BranchRulesetBypassActors.name,
        "description": BranchRulesetBypassActors.description,
        "pass": expected_pass,
    }

    assert expected == BranchRulesetBypassActors.check(mock_github, OWNER, REPO, BRANCH, config)


@pytest.mark.parametrize(
    "config,rulesets_dict,expected_pass",
    [
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            {
                1: {"bypass_actors": [ROLE_ACTOR]},
            },
            True,
            id="should pass if only ruleset passes",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            {
                1: {"bypass_actors": [APP_ACTOR]},
            },
            False,
            id="should fail if only ruleset fails",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            {1: {"bypass_actors": [TEAM_ACTOR]}, 2: {"bypass_actors": [APP_ACTOR]}},
            False,
            id="should fail if both rulesets fail",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            {1: {"bypass_actors": [ROLE_ACTOR]}, 2: {"bypass_actors": [APP_ACTOR]}},
            False,
            id="should fail if one ruleset passes and one ruleset fails",
        ),
        pytest.param(
            {"allowed_bypass_actor_ids": [ROLE_ACTOR.get("actor_id")]},
            {1: {"bypass_actors": [ROLE_ACTOR]}, 2: {"bypass_actors": [ROLE_ACTOR]}},
            True,
            id="should pass if both rulesets pass",
        ),
    ],
)
def test_multiple_rulesets(config, rulesets_dict, expected_pass):
    mock_github = Github(None)

    mock_branch_rules_response = list(map(lambda key: {"ruleset_id": key}, rulesets_dict.keys()))
    mock_github.get_branch_rules = MagicMock(return_value=mock_branch_rules_response)

    mock_github.get_repo_ruleset = MagicMock(side_effect=lambda owner, repo, ruleset_id: rulesets_dict.get(ruleset_id))

    expected = {
        "id": BranchRulesetBypassActors.identifier,
        "name": BranchRulesetBypassActors.name,
        "description": BranchRulesetBypassActors.description,
        "pass": expected_pass,
    }

    assert expected == BranchRulesetBypassActors.check(mock_github, OWNER, REPO, BRANCH, config)
