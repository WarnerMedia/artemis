import unittest
from unittest.mock import MagicMock

from ...src.rules import BranchRuleCommitSigning
from ...src.utilities import Github

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"


class TestBranchRuleCommitSigning(unittest.TestCase):
    def test_no_required_signatures(self):
        mock_github = Github(None)
        mock_response = []
        mock_github.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchRuleCommitSigning.identifier,
            "name": BranchRuleCommitSigning.name,
            "description": BranchRuleCommitSigning.description,
            "pass": False,
        }

        self.assertEqual(expected, BranchRuleCommitSigning.check(mock_github, OWNER, REPO, BRANCH))

    def test_required_signatures(self):
        mock_github = Github(None)
        mock_response = [
            {
                "type": "required_signatures",
                "ruleset_source_type": "Repository",
                "ruleset_source": "org/repo",
                "ruleset_id": 1,
            }
        ]
        mock_github.get_branch_rules = MagicMock(return_value=mock_response)

        expected = {
            "id": BranchRuleCommitSigning.identifier,
            "name": BranchRuleCommitSigning.name,
            "description": BranchRuleCommitSigning.description,
            "pass": True,
        }

        self.assertEqual(expected, BranchRuleCommitSigning.check(mock_github, OWNER, REPO, BRANCH))
