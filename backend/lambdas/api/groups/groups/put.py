from http import HTTPStatus
from typing import Union

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from artemisdb.artemisdb.models import Group
from artemislib.audit.logger import AuditLogger
from artemislib.utils import convert_list_strings_to_lowercase
from groups.util.events import ParsedEvent
from groups.util.messages import INVALID_SCOPE
from groups.util.validators import validate_group_auth, validate_put_group_body, validate_put_scope


def put(
    event: dict, principal: dict = None, admin: bool = None, group_auth: dict = None, source_ip: str = None, **kwargs
):
    try:
        parsed_event = ParsedEvent(event)
        validate_put_group_body(parsed_event.body, admin)
        group_admin = validate_group_auth(group_auth, parsed_event.group_id, admin)
        if not admin and not group_admin:
            # Only Artemis admins or group admins can alter groups
            return response(code=HTTPStatus.FORBIDDEN)
    except ValidationError as e:
        return response({"message": e.message}, e.code)
    db_caller = GroupsDBHelper()

    group = db_caller.get_group(group_id=parsed_event.group_id, admin=admin)
    if group is None:
        return response(code=HTTPStatus.NOT_FOUND)
    # Tracking for audit logging
    new_scope = get_new_scope(group, parsed_event.body.get("permissions", {}))
    if not validate_scope(group, new_scope):
        return response({"message": INVALID_SCOPE}, code=HTTPStatus.INVALID_REQUEST)
    new_features = verify_put_item(group, "features", parsed_event.body.get("permissions", {}))
    new_name = verify_put_item(group, "name", parsed_event.body)
    new_description = verify_put_item(group, "description", parsed_event.body)
    new_allowlist = verify_put_item(group, "allowlist", parsed_event.body.get("permissions", {}))
    new_admin = verify_put_item(group, "admin", parsed_event.body.get("permissions", {}), True, admin)

    if (
        new_scope is not None
        or new_features is not None
        or new_name is not None
        or new_allowlist is not None
        or new_description is not None
        or new_admin is not None
    ):
        # Only save and record an audit event if something changed
        group.save()

        audit_log = AuditLogger(principal=principal["id"], source_ip=source_ip)
        audit_log.group_modified(group.group_id, new_name, new_scope, new_features, new_admin, new_allowlist)

    return response(group.to_dict())


def get_new_scope(group: Group, permissions: dict) -> Union[list, None]:
    """
    Gets the scope from the permissions dict only if different from the existing group scope.
    This facilitates only doing DB and audit log operations if the scope has changed.

    Parameters:
      group: Group object to compare against
      permissions: The "permissions" portion of the PUT body

    Returns:
      The permissions["scope"] if it is different from the current scope, None otherwise.
    """
    if "scope" not in permissions:
        return None
    scope = convert_list_strings_to_lowercase(permissions["scope"])
    if scope != group.scope:
        return scope
    return None


def validate_scope(group, scope):
    if not scope:
        return True
    if not validate_put_scope(group.parent, scope):
        return False
    group.scope = scope
    return True


def verify_put_item(obj, var, event_body, admin_required: bool = False, admin: bool = False):
    if var in event_body and getattr(obj, var) != event_body[var]:
        if not admin_required or (admin_required and admin):
            setattr(obj, var, event_body[var])
            return event_body[var]
    return None
