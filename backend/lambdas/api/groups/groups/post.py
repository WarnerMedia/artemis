from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from artemislib.audit.logger import AuditLogger
from groups.util.events import ParsedEvent
from groups.util.messages import GROUP_DUPE, GROUP_POST_ADMIN_ERROR, GROUP_POST_ERROR, PARENT_NOT_FOUND, USER_NOT_FOUND
from groups.util.validators import validate_post_group


def post(
    event: dict = None,
    principal: dict = None,
    admin: bool = False,
    group_auth: dict = None,
    source_ip: str = None,
    **kwargs,
):
    try:
        parsed_event = ParsedEvent(event)
        validate_post_group(parsed_event.body, admin, group_auth)
        return post_group(parsed_event, principal["id"], source_ip, admin)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)


def post_group(parsed_event, email, source_ip, admin=False):
    db_caller = GroupsDBHelper(AuditLogger(email, source_ip))
    # Get User
    user = db_caller.get_user(email)
    if user is None:
        # If we can't find the user record for the user making the request something has really gone wrong.
        # Maybe the user record was deleted?
        return response({"message": USER_NOT_FOUND}, code=HTTPStatus.UNAUTHORIZED)
    # Get Parent
    parent = None
    if parsed_event.body.get("parent"):
        parent = db_caller.get_group(group_id=parsed_event.body.get("parent"), admin=admin)
        if parent is None:
            return response({"message": PARENT_NOT_FOUND}, code=HTTPStatus.BAD_REQUEST)
    # Check if Group Exists
    parent_id = parent.id if parent else None
    if db_caller.does_group_exist(name=parsed_event.body.get("name"), parent=parent_id):
        return response({"message": GROUP_DUPE}, code=HTTPStatus.CONFLICT)

    group = db_caller.create_group(
        parent=parent,
        name=parsed_event.body.get("name"),
        description=parsed_event.body.get("description"),
        scope=parsed_event.body["permissions"].get("scope", []),
        user=user,
        features=parsed_event.body["permissions"].get("features", {}),
        allowlist=parsed_event.body["permissions"].get("allowlist", False),
        admin=parsed_event.body["permissions"].get("admin", False),
    )
    if group is None:
        return response({"message": GROUP_POST_ERROR}, code=HTTPStatus.BAD_REQUEST)
    # If a non-artemis admin creates a subgroup, they need to become the group admin of the subgroup.
    # Failure to do this results in a subgroup only an artemis admin can alter or add users to.
    if not admin and parent is not None:
        if not db_caller.create_group_member(group, user, True):
            return response(
                {"result": group.to_dict(), "message": GROUP_POST_ADMIN_ERROR}, code=HTTPStatus.MULTI_STATUS
            )
    return response(group.to_dict())
