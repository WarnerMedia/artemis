import unittest

from github_repo_health.rules import BranchProtectionCommitSigning, helpers
from github_repo_health.rules.helpers import add_metadata

OWNER = "owner"
REPO = "repo"
BRANCH = "branch"

DOCS_URL = "http://example.com"


class TestHelpers(unittest.TestCase):
    def test_add_metadata_should_not_have_docs_url_if_not_provided(self):
        config = {}
        result = add_metadata(True, BranchProtectionCommitSigning, config)

        expected = {
            "pass": True,
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
        }

        self.assertEqual(expected, result)

    def test_add_metadata_should_have_docs_url_if_provided(self):
        config = {"docs_url": DOCS_URL}
        result = add_metadata(True, BranchProtectionCommitSigning, config)

        expected = {
            "pass": True,
            "id": BranchProtectionCommitSigning.identifier,
            "name": BranchProtectionCommitSigning.name,
            "description": BranchProtectionCommitSigning.description,
            "docs_url": DOCS_URL,
        }

        self.assertEqual(expected, result)
