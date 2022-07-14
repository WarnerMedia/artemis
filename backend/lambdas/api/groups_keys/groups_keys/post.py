from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.auth import generate_api_key
from artemisdb.artemisdb.models import Group, User
from artemislib.audit.logger import AuditLogger
from groups_keys.util.events import ParsedEvent
from groups_keys.util.validators import validate_post_group_key_body


def post(
    event,
    principal: dict = None,
    group_auth: dict = None,
    authz=None,
    admin: bool = False,
    features: dict = None,
    source_ip: str = None,
    **kwargs,
):
    try:
        parsed_event = ParsedEvent(event, parse_body=True)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if parsed_event.key_id:
        # POSTs create new resources so having an ID in the URL is an invalid request
        return response(code=HTTPStatus.BAD_REQUEST)

    try:
        # The group being requested for must exist and retrieve the group to pass into generate_api_key
        group = Group.objects.get(group_id=parsed_event.group_id, self_group=False, deleted=False)
        # The requester must be an existing user
        user = User.objects.get(email=principal["id"], deleted=False)
    except (Group.DoesNotExist, User.DoesNotExist):
        return response(code=HTTPStatus.NOT_FOUND)

    try:
        body = validate_post_group_key_body(parsed_event.body, group)
        # Validate the user/key has permissions for the group and return whether it has group_admin permissions.
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    audit_log = AuditLogger(principal=principal["id"], source_ip=source_ip)

    # keep user for now as the field hasn't been removed yet
    group_api_key = generate_api_key(
        user=user,
        group=group,
        name=body["name"],
        expires=body["expires"],
        scope=body["scope"],
        features=body.get("features", group.features or {}),  # Default to group's feature flags or empty if not set
        audit_log=audit_log,
    )

    return response({"key": group_api_key})
