import unittest

import pytest

from artemisdb.artemisdb.auth import generate_api_key, get_api_key
from artemisdb.artemisdb.models import Group, Repo
from authorizer.handlers import _get_api_key_group_permissions, _get_user


@pytest.mark.integtest
class TestAuthorizer(unittest.TestCase):
    """
    Test Class relies on the artemisdb docker container being up.
    """

    @classmethod
    def setUpClass(cls) -> None:
        # Ensure the two test repos exist
        cls.repo1 = Repo.objects.create(service="testservice", repo="testorg/testrepo1")
        cls.repo2 = Repo.objects.create(service="testservice", repo="testorg/testrepo2")

        # Create the test user
        cls.user = _get_user("testuser@example.com")

        # Set the user's permissions
        cls.user.scope = ["testservice/testorg/testrepo1"]
        cls.user.save()
        cls.user.self_group.scope = cls.user.scope
        cls.user.self_group.save()

        # Create a group
        cls.group = Group.objects.create(name="testgroup", scope=["testservice/testorg/testrepo2"])

        # Add the user to the group
        cls.group.groupmembership_set.create(user=cls.user, group_admin=False)

        # Create an API key for the user
        cls.apikey = get_api_key(
            generate_api_key(
                user=cls.user, group=cls.user.self_group, name="testkey", scope=["*"], admin=False, features={}
            )
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls.repo1.delete()
        cls.repo2.delete()
        cls.group.delete()
        cls.apikey.delete()
        cls.user.delete()

    def test_get_api_key_group_permissions(self):
        scope, features, allowlist_denied = _get_api_key_group_permissions(self.apikey)
        self.assertEqual(
            scope, [[["*"], ["testservice/testorg/testrepo1"]], [["*"], ["testservice/testorg/testrepo2"]]]
        )
        self.assertEqual(features, {})
        self.assertEqual(allowlist_denied, ["testservice/testorg/testrepo2"])

    def test_get_api_key_group_permissions_no_scope(self):
        try:
            # Set the user's permissions
            self.user.scope = []
            self.user.save()
            self.user.self_group.scope = self.user.scope
            self.user.self_group.save()

            scope, features, allowlist_denied = _get_api_key_group_permissions(self.apikey)
            self.assertEqual(scope, [[["*"], ["testservice/testorg/testrepo2"]], [[]]])
            self.assertEqual(features, {})
            self.assertEqual(allowlist_denied, ["testservice/testorg/testrepo2"])
        finally:
            # Reset the user's permissions
            self.user.scope = ["testservice/testorg/testrepo1"]
            self.user.save()
            self.user.self_group.scope = self.user.scope
            self.user.self_group.save()
