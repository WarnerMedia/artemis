from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group, GroupMembership
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters, page
from groups_members.util.events import ParsedEvent
from groups_members.util.validators import validate_group_auth


def get(event, principal: dict = None, group_auth: dict = None, admin: bool = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event)
        # Validate the user/key has permissions for the group and return whether it has group_admin permissions.
        validate_group_auth(group_auth, parsed_event.group_id, admin)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    try:
        group = Group.objects.get(group_id=parsed_event.group_id, self_group=False, deleted=False)
    except Group.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    if parsed_event.user_id:
        return get_group_member(group, parsed_event.user_id)
    return get_group_member_list(group=group, paging=parsed_event.paging)


def get_group_member(group: Group, user_id: str):
    try:
        group_member = group.groupmembership_set.get(user__email=user_id)
        return response(group_member.to_dict())
    except GroupMembership.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)


def get_group_member_list(group: Group, paging: PageInfo):
    map = FilterMap()
    map.add_string("user__email", "email")
    map.add_timestamp("added")
    map.add_boolean("group_admin")

    # Group members are not secret to other group members
    qs = group.groupmembership_set.all()
    qs = apply_filters(qs, filter_map=map, page_info=paging, default_order=["user__email"])
    return page(qs, paging.offset, paging.limit, f"groups/{group.group_id}/members")
