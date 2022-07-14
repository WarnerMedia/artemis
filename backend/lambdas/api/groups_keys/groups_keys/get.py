from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters, page
from groups_keys.util.events import ParsedEvent
from groups_keys.util.validators import validate_group_auth


def get(event, principal: dict = None, group_auth: dict = None, admin: bool = False, **kwargs):
    try:
        parsed_event = ParsedEvent(event, parse_body=False)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    # Validate the user/key has permissions for the group and return whether it has group_admin permissions.
    try:
        # Validate that the user is admin or is group admin for this group
        validate_group_auth(group_auth, parsed_event.group_id, admin)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.key_id:
        # Return the response for a single key
        return get_group_key(group_id=parsed_event.group_id, key_id=parsed_event.key_id)
    # Return the paged list of keys
    return get_group_key_list(group_id=parsed_event.group_id, paging=parsed_event.paging)


def get_group_key(group_id, key_id):
    try:
        key = (
            Group.objects.get(group_id=group_id, self_group=False, deleted=False)
            .apikey_set.filter(key_id=key_id)
            .first()
        )
    except Group.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    if not key:
        return response(code=HTTPStatus.NOT_FOUND)

    return response(key.to_dict())


def get_group_key_list(group_id, paging: PageInfo):
    map = FilterMap()
    map.add_string("name")
    map.add_timestamp("created")
    map.add_timestamp("expires")
    map.add_boolean("group_admin")

    try:
        qs = Group.objects.get(group_id=group_id, self_group=False, deleted=False).apikey_set.all()
        qs = apply_filters(qs, filter_map=map, page_info=paging, default_order=["name"])
    except Group.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    # Mimic DRF limit-offset paging
    return page(qs, paging.offset, paging.limit, f"groups/{group_id}/keys")
