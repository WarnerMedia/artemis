import unittest

import pytest

from artemisdb.artemisdb.models import Repo


@pytest.mark.integtest
class TestDatabase(unittest.TestCase):
    """
    Test Class relies on the artemisdb docker container being up.
    """

    @classmethod
    def setUpClass(cls) -> None:
        # Ensure at least one repo exists
        cls.repo = Repo.objects.create(service="testservice", repo="testorg/testrepo")

    @classmethod
    def tearDownClass(cls) -> None:
        cls.repo.delete()

    def test_empty_scope(self):
        # Test that empty scope does not return any repos
        repos = Repo.in_scope([[[]]])
        self.assertGreater(Repo.objects.all().count(), 0)  # Verify there are repos in the DB
        self.assertEqual(repos.count(), 0)  # Verify there are no repos in scope
