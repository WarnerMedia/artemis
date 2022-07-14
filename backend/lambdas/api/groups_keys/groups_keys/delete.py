from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import APIKey
from artemislib.audit.logger import AuditLogger
from groups_keys.util.events import ParsedEvent
from groups_keys.util.validators import validate_group_auth


def delete(
    event, principal: dict = None, group_auth: dict = None, admin: bool = False, source_ip: str = None, **kwargs
):
    audit = AuditLogger(principal["id"], source_ip)
    try:
        parsed_event = ParsedEvent(event, parse_body=False)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if not parsed_event.key_id or not parsed_event.group_id:
        # Key and group IDs are required
        return response(code=HTTPStatus.BAD_REQUEST)

    try:
        # Validate that the user is admin or is group admin for this group
        validate_group_auth(group_auth, parsed_event.group_id, admin)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    return delete_api_key(parsed_event.group_id, parsed_event.key_id, audit)


def delete_api_key(group_id, key_id, audit: AuditLogger):
    count, _ = APIKey.objects.filter(
        group__group_id=group_id, group__self_group=False, group__deleted=False, key_id=key_id
    ).delete()

    if count:
        audit.key_deleted(key_id)
        return response(code=HTTPStatus.NO_CONTENT)
    return response(code=HTTPStatus.NOT_FOUND)
