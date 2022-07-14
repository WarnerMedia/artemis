import unittest
import uuid
from unittest.mock import PropertyMock, patch

from artemisdb.artemisdb.models import APIKey, Group, GroupMembership, User
from authorizer.handlers import _get_api_key_group_permissions, _get_group_permissions


class TestGroupPermissions(unittest.TestCase):
    def setUp(self) -> None:
        self.user = User(email="testuser@example.com")
        self.group1 = Group(
            name="group1",
            group_id=uuid.UUID("49872542-baca-4ac4-9991-a65a27d97fe4"),
            scope=["org1/*"],
            features={"flag1": True, "flag2": False},
            parent=None,
            allowlist=True,
        )
        self.group2 = Group(
            name="group2",
            group_id=uuid.UUID("9d317ec4-2c33-407b-bf5c-c1ce8a6a2b4f"),
            scope=["org1/repo*"],
            features={},
            parent=self.group1,
            allowlist=True,
        )
        self.group3 = Group(
            name="group3",
            group_id=uuid.UUID("38362667-0386-4dc6-b1a9-38a3140f8232"),
            scope=["org1/repo1"],
            features={"flag1": True, "flag2": True, "flag3": True},
            parent=self.group2,
            allowlist=False,
        )
        self.group4 = Group(
            name="group4",
            group_id=uuid.UUID("5315f627-ea60-4863-bb03-052bd3040f75"),
            scope=["org2/*"],
            features={"flag4": True},
            parent=None,
            allowlist=True,
        )
        self.gm3 = GroupMembership(user=self.user, group=self.group3)
        self.gm4 = GroupMembership(user=self.user, group=self.group4, group_admin=True)

        self.api_key1 = APIKey(scope=["org1/repo1"])
        self.api_key1.group = self.group3

        self.api_key2 = APIKey(scope=["*"])
        self.api_key2.group = self.group3

    def test_get_group_permissions(self):
        with patch("artemisdb.artemisdb.models.User.groupmembership_set", new_callable=PropertyMock) as mock_set:
            mock_set.return_value.filter.return_value = [self.gm3, self.gm4]
            group_admin, scopes, features, allowlist_denied = _get_group_permissions(self.user)
            self.assertEqual(
                group_admin,
                {"38362667-0386-4dc6-b1a9-38a3140f8232": False, "5315f627-ea60-4863-bb03-052bd3040f75": True},
            )
            self.assertEqual(scopes, [[["org1/repo1"], ["org1/repo*"], ["org1/*"]], [["org2/*"]]])
            self.assertEqual(features, {"flag1": True, "flag2": False, "flag3": True, "flag4": True})
            self.assertEqual(allowlist_denied, ["org1/repo1"])

    def test_get_api_key_group_permissions(self):
        with patch("artemisdb.artemisdb.models.Group.objects.filter") as mock_groups:
            mock_groups.return_value = [self.group3]
            scopes, features, allowlist_denied = _get_api_key_group_permissions(self.api_key1)
            self.assertEqual(scopes, [[["org1/repo1"], ["org1/repo1"], ["org1/repo*"], ["org1/*"]]])
            self.assertEqual(features, {"flag1": True, "flag2": False, "flag3": True})
            self.assertEqual(allowlist_denied, ["org1/repo1"])

    def test_get_wildcard_api_key_group_permissions(self):
        with patch("artemisdb.artemisdb.models.Group.objects.filter") as mock_groups:
            mock_groups.return_value = [self.group3]
            scopes, features, allowlist_denied = _get_api_key_group_permissions(self.api_key2)
            self.assertEqual(scopes, [[["*"], ["org1/repo1"], ["org1/repo*"], ["org1/*"]]])
            self.assertEqual(features, {"flag1": True, "flag2": False, "flag3": True})
            self.assertEqual(allowlist_denied, ["org1/repo1"])
