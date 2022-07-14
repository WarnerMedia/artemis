from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group, GroupMembership, User
from artemislib.audit.logger import AuditLogger
from groups_members.util.events import ParsedEvent
from groups_members.util.utils import parse_body_for_groups_members
from groups_members.util.validators import validate_group_auth, validate_group_members_body

USER_ALREADY_MEMBER_MESSAGE = "User is already a member of this group"


def post(event, principal: dict = None, group_auth: dict = None, admin: bool = False, source_ip: str = None, **kwargs):
    audit = AuditLogger(principal["id"], source_ip)
    try:
        parsed_event = ParsedEvent(event, parse_body=True)
        validate_group_members_body(parsed_event.body)
        # Validate the user/key has permissions for the group and return whether it has group_admin permissions.
        group_admin = validate_group_auth(group_auth, parsed_event.group_id, admin)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if not admin and not group_admin:
        # Only Artemis admins or group_admins can create group memberships
        return response(code=HTTPStatus.FORBIDDEN)

    if parsed_event.user_id:
        return post_group_member(parsed_event, audit)
    return post_group_member_list(parsed_event, audit)


def post_group_member(parsed_event, audit: AuditLogger):
    try:
        # Check the user exists
        user = User.objects.get(email=parsed_event.user_id, deleted=False)
        # Check the group exists
        group = Group.objects.get(group_id=parsed_event.group_id, self_group=False, deleted=False)
    except (User.DoesNotExist, Group.DoesNotExist):
        return response(code=HTTPStatus.NOT_FOUND)

    # Check to see if the user is already a member
    if group.groupmembership_set.filter(user=user).exists():
        return response({"message": USER_ALREADY_MEMBER_MESSAGE}, code=HTTPStatus.CONFLICT)

    admin = parsed_event.body.get("group_admin", False)
    group_membership = group.groupmembership_set.create(user=user, group_admin=admin)
    audit.group_member_added(user.email, group.group_id, group.name, admin)

    return response(group_membership.to_dict())


# Function is a partial complete.
# It will create members for all the emails that are valid and skip over the emails that are not
def post_group_member_list(parsed_event, audit: AuditLogger):
    # Lists to store group_membership objects for bulk create
    gm_list = []
    # Dictionary for matching emails with group_admin changes from body
    email_group_admin_dict = parse_body_for_groups_members(parsed_event.body)

    # Find users based on emails populated in group_members_email list
    users = User.objects.filter(email__in=email_group_admin_dict.keys(), deleted=False)

    try:
        group = Group.objects.get(group_id=parsed_event.group_id, self_group=False, deleted=False)
    except Group.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    for user in users:
        # If a user is part of the group already, continue with adding other users
        if GroupMembership.objects.filter(group=group, user=user).exists():
            continue
        gm_list.append(GroupMembership(group=group, user=user, group_admin=email_group_admin_dict[user.email]))
    GroupMembership.objects.bulk_create(gm_list)
    for group_member in gm_list:
        audit.group_member_added(
            group_member.user.email, group_member.group.group_id, group_member.group.name, group_member.group_admin
        )
    return response([gm.to_dict() for gm in gm_list])
