from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group, GroupMembership
from artemislib.audit.logger import AuditLogger
from groups_members.util.events import ParsedEvent
from groups_members.util.validators import validate_group_auth, validate_group_members_body

GROUP_ADMIN_MUST_EXIST_MESSAGE = "Request denied, at least one group admin is required for the group."


def delete(
    event, principal: dict = None, group_auth: dict = None, admin: bool = False, source_ip: str = None, **kwargs
):
    audit = AuditLogger(principal["id"], source_ip)
    try:
        # isDelete flag is used because only for Delete when a user_id is present, a body should not be included.
        # when a user_id is not present, we need to parse the body for the list of users.
        parsed_event = ParsedEvent(event, parse_body=True, is_delete=True)
        if parsed_event.body:
            validate_group_members_body(parsed_event.body)

        try:
            group = Group.objects.get(group_id=parsed_event.group_id, self_group=False, deleted=False)
        except Group.DoesNotExist:
            return response(code=HTTPStatus.NOT_FOUND)

        # Validate the user/key has permissions for the group and return whether it has group_admin permissions.
        group_admin = validate_group_auth(group_auth, str(group.group_id), admin)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if not admin and not group_admin:
        # Only Artemis admins or group admins can delete group memberships
        return response(code=HTTPStatus.FORBIDDEN)

    if parsed_event.user_id:
        return delete_group_member(group, parsed_event.user_id, audit)
    return delete_group_member_list(group, parsed_event, audit)


def delete_group_member(group, user_id, audit: AuditLogger):
    if not check_group_admin_will_exist(group, [user_id]):
        return response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST)
    try:
        group.groupmembership_set.get(user__email=user_id).delete()
        audit.group_member_removed(user_id, str(group.group_id), group.name)
    except GroupMembership.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    return response(code=HTTPStatus.NO_CONTENT)


def delete_group_member_list(group, parsed_event, audit):
    group_delete_emails = [member["email"] for member in parsed_event.body]

    if not check_group_admin_will_exist(group, group_delete_emails):
        return response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST)

    return delete_group_members(group, group_delete_emails, audit)


def check_group_admin_will_exist(group, emails):
    # Return whether the remaining set of group admins is non-zero
    count = group.groupmembership_set.filter(group_admin=True).exclude(user__email__in=emails).count()
    return count > 0


def delete_group_members(group, group_delete_emails, audit: AuditLogger):
    # Function created largely for testing to mock .delete()
    group_members = group.groupmembership_set.filter(user__email__in=group_delete_emails).prefetch_related("user")
    if group_members.count() == 0:
        return response(code=HTTPStatus.NOT_FOUND)
    deleted_emails = [gm.user.email for gm in group_members]
    group_members.delete()
    for email in deleted_emails:
        audit.group_member_removed(email, str(group.group_id), group.name)
    return response(code=HTTPStatus.NO_CONTENT)
