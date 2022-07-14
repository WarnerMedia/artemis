import unittest
from http import HTTPStatus
from unittest.mock import patch

from artemisapi.response import response
from groups import delete as groups_delete

GROUP_ID = "87879daa-e6cb-4bf9-8575-649b00aff132"

UNPARSED_EVENT_ID = {"pathParameters": {"id": GROUP_ID}}


class TestGroupsDelete(unittest.TestCase):
    @patch.object(groups_delete, "GroupsDBHelper")
    def test_delete_group_success_admin(self, db_caller):
        self.assertEqual(groups_delete.GroupsDBHelper, db_caller)
        db_caller().delete_group.return_value = True
        result = groups_delete.delete_group("group_id", None)
        self.assertEqual(response(code=HTTPStatus.NO_CONTENT), result)

    @patch.object(groups_delete, "GroupsDBHelper")
    def test_delete_group_failure(self, db_caller):
        self.assertEqual(groups_delete.GroupsDBHelper, db_caller)
        db_caller().delete_group.return_value = False
        result = groups_delete.delete_group("group_id", None)
        self.assertEqual(response(code=HTTPStatus.NOT_FOUND), result)

    @patch.object(groups_delete, "GroupsDBHelper")
    def test_delete_success_not_admin_group_admin(self, db_caller):
        self.assertEqual(groups_delete.GroupsDBHelper, db_caller)
        db_caller().delete_group.return_value = True
        result = groups_delete.delete(
            UNPARSED_EVENT_ID, {"id": "testuser@example.com", "type": "user"}, False, {GROUP_ID: True}, "127.0.0.1"
        )
        self.assertEqual(response(code=HTTPStatus.NO_CONTENT), result)
