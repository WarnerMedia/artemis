import pytest
from unittest.mock import MagicMock, patch

from github_repo_health.rules import CompositeRule

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

PASS_TYPE = "branch_protection_commit_signing"
FAIL_TYPE = "branch_rule_commit_signing"
ERROR_1_TYPE = "branch_protection_pull_requests"
ERROR_2_TYPE = "branch_rule_pull_requests"

PASS_CONFIG = {"type": PASS_TYPE}
FAIL_CONFIG = {"type": FAIL_TYPE}
ERROR_1_CONFIG = {"type": ERROR_1_TYPE}
ERROR_2_CONFIG = {"type": ERROR_2_TYPE}

ERROR_1_MESSAGE = "First error"
ERROR_2_MESSAGE = "Second error"

PASS_RESULT = {
    "id": PASS_TYPE,
    "name": "Successful example",
    "description": "This one always passes",
    "pass": True,
}
FAIL_RESULT = {
    "id": FAIL_TYPE,
    "name": "Unsuccessful example",
    "description": "This one always fails",
    "pass": False,
}
ERROR_1_RESULT = {
    "id": ERROR_1_TYPE,
    "name": "Errored example 1",
    "description": "This one always errors with the first error message",
    "pass": False,
    "error_message": ERROR_1_MESSAGE,
}
ERROR_2_RESULT = {
    "id": ERROR_2_TYPE,
    "name": "Errored example 2",
    "description": "This one always errors with the second error message",
    "pass": False,
    "error_message": ERROR_2_MESSAGE,
}

RESULTS_DICT = {
    PASS_TYPE: PASS_RESULT,
    FAIL_TYPE: FAIL_RESULT,
    ERROR_1_TYPE: ERROR_1_RESULT,
    ERROR_2_TYPE: ERROR_2_RESULT,
}


@pytest.mark.parametrize(
    "config,expected_pass",
    [
        pytest.param({}, True, id="should pass if nothing specified in config"),
        pytest.param(
            {"subrules": {"all_of": [PASS_CONFIG]}},
            True,
            id="should pass if subrules is all_of with one item and it passes",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        FAIL_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is all_of with one item and it fails",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        PASS_CONFIG,
                        PASS_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            True,
            id="should pass if subrules is all_of with three items that all pass",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        PASS_CONFIG,
                        FAIL_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is all_of with three items and one fails",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        FAIL_CONFIG,
                        FAIL_CONFIG,
                        FAIL_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is all_of with three items that all fail",
        ),
        pytest.param(
            {"subrules": {"any_of": [PASS_CONFIG]}},
            True,
            id="should pass if subrules is any_of with one item and it passes",
        ),
        pytest.param(
            {
                "subrules": {
                    "any_of": [
                        FAIL_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is any_of with one item and it fails",
        ),
        pytest.param(
            {
                "subrules": {
                    "any_of": [
                        PASS_CONFIG,
                        PASS_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            True,
            id="should pass if subrules is any_of with three items that all pass",
        ),
        pytest.param(
            {
                "subrules": {
                    "any_of": [
                        PASS_CONFIG,
                        FAIL_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            True,
            id="should pass if subrules is any_of with three items and one fails",
        ),
        pytest.param(
            {
                "subrules": {
                    "any_of": [
                        FAIL_CONFIG,
                        FAIL_CONFIG,
                        FAIL_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is any_of with three items that all fail",
        ),
        pytest.param(
            {"subrules": {"none_of": [PASS_CONFIG]}},
            False,
            id="should fail if subrules is none_of with one item and it passes",
        ),
        pytest.param(
            {
                "subrules": {
                    "none_of": [
                        FAIL_CONFIG,
                    ]
                }
            },
            True,
            id="should pass if subrules is none_of with one item and it fails",
        ),
        pytest.param(
            {
                "subrules": {
                    "none_of": [
                        PASS_CONFIG,
                        PASS_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is none_of with three items that all pass",
        ),
        pytest.param(
            {
                "subrules": {
                    "none_of": [
                        PASS_CONFIG,
                        FAIL_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            False,
            id="should fail if subrules is none_of with three items and one fails",
        ),
        pytest.param(
            {
                "subrules": {
                    "none_of": [
                        FAIL_CONFIG,
                        FAIL_CONFIG,
                        FAIL_CONFIG,
                    ]
                }
            },
            True,
            id="should pass if subrules is none_of with three items that all fail",
        ),
    ],
)
@patch("github_repo_health.utilities.Checker")
def test_rule(Checker, config, expected_pass):
    mock_checker = MagicMock()
    mock_checker.run_check = MagicMock(side_effect=_get_checker_result)
    Checker.return_value = mock_checker

    expected = {
        "id": CompositeRule.identifier,
        "name": CompositeRule.name,
        "description": CompositeRule.description,
        "pass": expected_pass,
    }

    actual = CompositeRule.check(None, OWNER, REPO, BRANCH, config)

    # Since the checker is static, we need to set it to None to clean up between tests
    CompositeRule._checker = None

    assert expected == actual


@pytest.mark.parametrize(
    "config,expected_error_message",
    [
        pytest.param(
            {"subrules": {"all_of": [ERROR_1_CONFIG]}},
            f"{ERROR_1_TYPE}: {ERROR_1_MESSAGE}",
            id="should error as intended with a single error",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        ERROR_1_CONFIG,
                        PASS_CONFIG,
                    ]
                }
            },
            f"{ERROR_1_TYPE}: {ERROR_1_MESSAGE}",
            id="should error as intended with a single error even if another rule passes without errors",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        ERROR_1_CONFIG,
                        ERROR_2_CONFIG,
                    ]
                }
            },
            f"{ERROR_1_TYPE}: {ERROR_1_MESSAGE}, {ERROR_2_TYPE}: {ERROR_2_MESSAGE}",
            id="should error as intended with two errors",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        PASS_CONFIG,
                        ERROR_1_CONFIG,
                        ERROR_2_CONFIG,
                    ]
                }
            },
            f"{ERROR_1_TYPE}: {ERROR_1_MESSAGE}, {ERROR_2_TYPE}: {ERROR_2_MESSAGE}",
            id="should error as intended with two errors even if another rule has no errors",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        ERROR_1_CONFIG,
                    ],
                    "any_of": [
                        ERROR_2_CONFIG,
                    ],
                }
            },
            f"{ERROR_1_TYPE}: {ERROR_1_MESSAGE}, {ERROR_2_TYPE}: {ERROR_2_MESSAGE}",
            id="should error as intended with two errors in different logic blocks",
        ),
        pytest.param(
            {
                "subrules": {
                    "all_of": [
                        ERROR_1_CONFIG,
                    ],
                    "any_of": [
                        ERROR_2_CONFIG,
                    ],
                    "none_of": [
                        PASS_CONFIG,
                    ],
                }
            },
            f"{ERROR_1_TYPE}: {ERROR_1_MESSAGE}, {ERROR_2_TYPE}: {ERROR_2_MESSAGE}",
            id="should error as intended with two errors in different logic blocks and a non-error in a third logic block",
        ),
    ],
)
@patch("github_repo_health.utilities.Checker")
def test_errors(Checker, config, expected_error_message):
    mock_checker = MagicMock()
    mock_checker.run_check = MagicMock(side_effect=_get_checker_result)
    Checker.return_value = mock_checker

    expected = {
        "id": CompositeRule.identifier,
        "name": CompositeRule.name,
        "description": CompositeRule.description,
        "pass": False,
        "error_message": expected_error_message,
    }

    actual = CompositeRule.check(None, OWNER, REPO, BRANCH, config)

    # Since the checker is static, we need to set it to None to clean up between tests
    CompositeRule._checker = None

    assert expected == actual


def _get_checker_result(config, owner, repo, branch):
    rule_type = config.get("type")

    return RESULTS_DICT.get(rule_type)
