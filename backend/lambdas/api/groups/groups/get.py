from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from artemisdb.artemisdb.paging import PageInfo, page
from groups.util.events import ParsedEvent
from groups.util.validators import ValidationError


def get(event: dict = None, principal: dict = None, admin: bool = None, group_admin: dict = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event, False)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.group_id:
        return get_group(parsed_event.group_id, principal, admin, group_admin)
    return get_groups_with_paging(principal, admin, parsed_event.paging)


def get_group(group_id: str, principal: dict, admin: bool, group_admin: bool):
    """
    Validation: User is part of the group, an artemis admin, OR the user is a group admin of the parent.
    Returns a group dict
    """
    try:
        db_caller = GroupsDBHelper()
        group = db_caller.get_group(group_id, admin)
        if group is None:
            return response(code=HTTPStatus.NOT_FOUND)
        group_response = response(group.to_dict())

        # If principal is an admin or a member of the group, return the group
        if admin or db_caller.is_group_member(principal["id"], group_id):
            return group_response

        # If principal is group_admin of parent and the key is a group_admin key, return group
        if (
            group.parent
            and group.parent.group_id in group_admin
            and group_admin[group.parent.group_id]
            and db_caller.is_group_admin(principal["id"], group.parent.group_id)
        ):
            return group_response
        return response(code=HTTPStatus.NOT_FOUND)
    except ValidationError as e:
        return response({"message": e.message}, e.code)


def get_groups_with_paging(principal, admin, paging: PageInfo):
    """
    Get list of groups based on the user's admission OR all groups if the user is an Artemis Admin.
    """
    db_caller = GroupsDBHelper()
    groups = db_caller.get_groups(principal["id"], admin, paging)
    return page(groups, paging.offset, paging.limit, "groups")
