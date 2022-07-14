import time
import unittest

import pytest

from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from artemisdb.artemisdb.models import Group
from artemisdb.artemisdb.paging import PageInfo
from tests.test_utils.create_records import DEFAULT_TEST_GROUP_VALUES, create_group_members, create_groups, create_user

TEST_USER = {"email": f"{time.time_ns()}@example.com", "scope": ["service/org/repo"], "features": {}, "admin": True}
TEST_USER2 = {"email": f"{time.time_ns()}_2@example.com", "scope": ["service/org/repo"], "features": {}, "admin": True}


@pytest.mark.integtest
class TestGroupsDbCalls(unittest.TestCase):
    """
    Test Class relies on the artemisdb docker container being up.
    """

    @classmethod
    def setUpClass(cls) -> None:
        cls.db_caller = GroupsDBHelper()
        cls.test_user = create_user(db_caller=cls.db_caller, **TEST_USER)
        cls.test_user2 = create_user(db_caller=cls.db_caller, **TEST_USER2)
        groups = create_groups(cls.db_caller, cls.test_user, None, 2)

        cls.test_group_1 = groups[0]
        cls.test_group_2 = groups[1]

        subgroups = create_groups(cls.db_caller, cls.test_user, cls.test_group_1, 2)

        cls.test_subgroup_1 = subgroups[0]
        cls.test_subgroup_2 = subgroups[1]

        create_group_members(cls.db_caller, [{"group": cls.test_group_1, "user": cls.test_user, "group_admin": True}])
        create_group_members(cls.db_caller, [{"group": cls.test_group_2, "user": cls.test_user, "group_admin": False}])
        create_group_members(cls.db_caller, [{"group": cls.test_group_1, "user": cls.test_user2, "group_admin": False}])
        cls.delete_groups = []
        for group in groups + subgroups:
            cls.delete_groups.append(str(group.group_id))

    @classmethod
    def tearDownClass(cls) -> None:
        cls.db_caller.user.objects.get(email=TEST_USER["email"]).delete()
        cls.db_caller.group.objects.filter(group_id__in=cls.delete_groups).delete()

    def test_get_group(self):
        group = self.db_caller.get_group(self.test_group_1.group_id, True)
        self.assertIsInstance(group.to_dict(), dict)

    def test_get_user(self):
        user = self.db_caller.get_user(self.test_user.email)
        self.assertEqual(self.test_user.id, user.id)

    def test_create_group_with_parent(self):
        try:
            group = self.db_caller.create_group(
                user=self.test_user,
                parent=self.test_group_2,
                name="test_create_group_with_parent",
                **DEFAULT_TEST_GROUP_VALUES,
            )
            self.delete_groups.append(str(group.group_id))
            self.assertEqual(group.parent.id, self.test_group_2.id)
        finally:
            if group:
                self.db_caller.delete_group(group.group_id)

    def test_create_delete_get_group(self):
        group = self.db_caller.create_group(
            user=self.test_user, parent=None, name="test_create_delete_group", **DEFAULT_TEST_GROUP_VALUES
        )
        group_id = str(group.group_id)
        self.delete_groups.append(group_id)
        delete_result = self.db_caller.delete_group(group_id=group_id)
        self.assertTrue(delete_result)

        group = self.db_caller.get_group(group_id=group_id, admin=True)
        self.assertIsNone(group)  # get_group does not return deleted groups

        # Check DB directly via ORM
        group = Group.objects.get(group_id=group_id)
        self.assertTrue(group.deleted)

    def test_get_groups_admin(self):
        groups = self.db_caller.get_groups(None, True, PageInfo(0, 10, [], []))
        group_ids = {str(group.group_id) for group in groups}
        self.assertEqual(group_ids, set([str(g.group_id) for g in groups]))

    def test_get_groups_not_admin_multi_group(self):
        groups = self.db_caller.get_groups(TEST_USER["email"], False, PageInfo(0, 10, [], []))
        group_ids = {str(group.group_id) for group in groups}
        self.assertEqual(
            {
                str(self.test_group_1.group_id),
                str(self.test_subgroup_1.group_id),
                str(self.test_subgroup_2.group_id),
                str(self.test_group_2.group_id),
            },
            group_ids,
        )

    def test_get_groups_not_admin_one_group_not_group_admin(self):
        groups = self.db_caller.get_groups(TEST_USER2["email"], False, PageInfo(0, 10, [], []))
        group_ids = {str(group.group_id) for group in groups}
        self.assertEqual(
            {str(self.test_group_1.group_id)},
            group_ids,
        )
