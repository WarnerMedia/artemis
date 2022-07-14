from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from artemislib.audit.logger import AuditLogger
from groups.util.events import ParsedEvent
from groups.util.validators import validate_group_auth


def delete(
    event: dict = None,
    principal: dict = None,
    admin: bool = None,
    group_auth: dict = None,
    source_ip: str = None,
    **kwargs
):
    try:
        parsed_event = ParsedEvent(event, False)
        group_admin = validate_group_auth(group_auth, parsed_event.group_id, admin)
        if not admin and not group_admin:
            # Only Artemis admins or group admins can delete groups
            return response(code=HTTPStatus.FORBIDDEN)
        return delete_group(parsed_event.group_id, AuditLogger(principal["id"], source_ip))
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)


def delete_group(group_id, audit):
    db_caller = GroupsDBHelper(audit)
    if db_caller.delete_group(group_id):
        return response(code=HTTPStatus.NO_CONTENT)
    return response(code=HTTPStatus.NOT_FOUND)
