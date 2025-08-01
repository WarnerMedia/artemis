import unittest
from unittest.mock import patch, MagicMock

from github_repo_health.utilities.checker import Checker


class TestChecker(unittest.TestCase):
    @patch("github_repo_health.rules.rules_dict")
    def test_run_check_should_run_when_enabled_is_omitted(self, mock_rules_dict):
        mock_github = MagicMock()

        mock_rule = MagicMock()
        mock_rule.check.return_value = "expected_result"
        mock_rules_dict.get.return_value = mock_rule

        rule_type = "dummy_rule"
        owner = "test_owner"
        repo = "test_repo"
        branch = "main"

        rule_config = {"type": rule_type}
        config = {"rules": [rule_config]}

        checker = Checker(mock_github, config)

        result = checker.run(owner, repo, branch)

        mock_rules_dict.get.assert_called_once_with(rule_type)
        mock_rule.check.assert_called_once_with(mock_github, owner, repo, branch, rule_config)
        self.assertIn("expected_result", result)
