from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group, GroupMembership
from artemislib.audit.logger import AuditLogger
from groups_members.delete import check_group_admin_will_exist
from groups_members.util.events import ParsedEvent
from groups_members.util.utils import parse_body_for_groups_members
from groups_members.util.validators import validate_group_auth, validate_group_members_body

GROUP_ADMIN_MUST_EXIST_MESSAGE = "Request denied, at least one group admin is required for the group."


def put(event, principal: dict = None, group_auth: dict = None, admin: bool = False, source_ip: str = None, **kwargs):
    audit = AuditLogger(principal["id"], source_ip)
    try:
        parsed_event = ParsedEvent(event, parse_body=True)
        validate_group_members_body(parsed_event.body)
        # Validate the user/key has permissions for the group and return whether it has group_admin permissions.
        group_admin = validate_group_auth(group_auth, parsed_event.group_id, admin)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if not admin and not group_admin:
        # Only Artemis admins or group_admins can create group_memberships
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        group = Group.objects.get(group_id=parsed_event.group_id, self_group=False, deleted=False)
    except Group.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    if parsed_event.user_id:
        return put_group_member(parsed_event, group, audit)
    return put_group_member_list(parsed_event, group, audit)


def put_group_member(parsed_event, group: Group, audit: AuditLogger):
    try:
        group_member = group.groupmembership_set.get(user__email=parsed_event.user_id)
    except GroupMembership.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    # Change group_admin field only when its different
    if "group_admin" in parsed_event.body and group_member.group_admin != parsed_event.body["group_admin"]:
        group_member.group_admin = parsed_event.body["group_admin"]

        # Before changing, make sure a group_admin will exist when this member is no longer admin.
        if not group_member.group_admin and not check_group_admin_will_exist(group, [group_member.user.email]):
            return response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST)

        group_member.save()
        audit.group_member_modified(group_member.user.email, str(group.group_id), group.name, group_member.group_admin)
    return response(group_member.to_dict())


# Function is a partial complete -- it will update all the emails that are valid and
# skip over the emails that are not within the body.
def put_group_member_list(parsed_event, group: Group, audit: AuditLogger):
    # List to store group_membership objects for bulk update
    gm_list = []
    # Dictionary for matching emails with group_admin changes from body
    email_group_admin_dict = parse_body_for_groups_members(parsed_event.body)
    # Group Member being changed to a group admin
    new_group_admin_flag = False

    # Find group memberships based on group_id and emails populated in group_members_email list
    group_members = group.groupmembership_set.filter(user__email__in=email_group_admin_dict.keys())

    for member in group_members:
        if email_group_admin_dict[member.user.email] != member.group_admin:
            member.group_admin = email_group_admin_dict[member.user.email]
            if member.group_admin:
                new_group_admin_flag = True
            # Only add to list of group members when there is a change.
            gm_list.append(member)

    # Before changing, make sure a group_admin will exist if no members are being updated to be admin
    if not new_group_admin_flag and not check_group_admin_will_exist(group, [member.user.email for member in gm_list]):
        return response({"message": GROUP_ADMIN_MUST_EXIST_MESSAGE}, HTTPStatus.BAD_REQUEST)

    # Bulk update all group member objects with change.
    group.groupmembership_set.bulk_update(gm_list, ["group_admin"])
    for group_member in gm_list:
        audit.group_member_modified(
            group_member.user.email, group_member.group.group_id, group_member.group.name, group_member.group_admin
        )
    return response([gm.to_dict() for gm in gm_list])
