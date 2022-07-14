import json
import unittest
from http import HTTPStatus
from unittest.mock import patch

from artemisapi.response import response
from artemisdb.artemisdb.paging import PageInfo
from groups import get as groups_get
from groups.util.events import PAGING_WITH_GROUP_ID_INVALID
from tests.stubs.mock_group import MockGroup

EVENT = {
    "pathParameters": {},
    "id": None,
    "queryStringParameters": {},
}


class TestGroupsGet(unittest.TestCase):
    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_admin(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        db_caller().get_group.return_value = mock_group
        result = groups_get.get_group(mock_group.group_id, {"id": "email", "type": "user"}, True, {})
        expected_result = response(mock_group.to_dict())
        self.assertEqual(expected_result, result)

    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_member(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        db_caller().get_group.return_value = mock_group
        db_caller().is_group_member.return_value = True
        result = groups_get.get_group(
            mock_group.group_id, {"id": "email", "type": "user"}, False, {mock_group.group_id: False}
        )
        expected_result = response(mock_group.to_dict())
        self.assertEqual(expected_result, result)

    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_parent_admin(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        parent_id = "1234098fje"
        mock_group = MockGroup()
        mock_group.parent = MockGroup(group_id=parent_id)
        db_caller().get_group.return_value = mock_group
        result = groups_get.get_group(
            mock_group.group_id, {"id": "email", "type": "user"}, False, {mock_group.parent.group_id: True}
        )
        expected_result = response(mock_group.to_dict())
        self.assertEqual(expected_result, result)

    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_no_group(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        db_caller().get_group.return_value = None
        expected_result = response(code=HTTPStatus.NOT_FOUND)
        result = groups_get.get_group(None, {"id": "email", "type": "user"}, True, {})
        self.assertEqual(expected_result, result)

    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_unauthorized_not_group_key(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        mock_group.parent = MockGroup()
        db_caller().get_group.return_value = mock_group
        db_caller().is_group_member.return_value = False
        db_caller().is_group_admin.return_value = False
        expected_result = response(code=HTTPStatus.NOT_FOUND)
        result = groups_get.get_group(mock_group.group_id, {"id": "email", "type": "user"}, False, {"230948f": True})
        self.assertEqual(expected_result, result)

    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_unauthorized_not_parent_admin(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        parent_id = "1234098fje"
        mock_group = MockGroup()
        mock_group.parent = MockGroup(group_id=parent_id)
        db_caller().get_group.return_value = mock_group
        db_caller().is_group_member.return_value = False
        db_caller().is_group_admin.return_value = False
        expected_result = response(code=HTTPStatus.NOT_FOUND)
        result = groups_get.get_group(mock_group.group_id, {"id": "email", "type": "user"}, False, {parent_id: False})
        self.assertEqual(expected_result, result)

    @patch.object(groups_get, "GroupsDBHelper")
    def test_get_group_with_paging(self, db_caller):
        self.assertEqual(groups_get.GroupsDBHelper, db_caller)
        mock_group = MockGroup()
        db_caller().get_groups.return_value = [mock_group]
        result = groups_get.get_groups_with_paging({"id": "email", "type": "user"}, False, PageInfo(0, 25, [], []))
        result_body = result["body"]
        body = json.loads(result_body)
        difference = {"results", "count", "next", "previous"}.difference(body.keys())
        self.assertEqual(set(), difference)
        self.assertEqual([mock_group.to_dict()], body["results"])

    def test_main_get_group_id_and_offset_mismatch(self):
        event = dict(EVENT)
        event["pathParameters"]["id"] = 183
        event["queryStringParameters"]["offset"] = 18
        expected_result = response({"message": PAGING_WITH_GROUP_ID_INVALID}, code=HTTPStatus.BAD_REQUEST)
        result = groups_get.get(event)
        self.assertEqual(expected_result, result)
