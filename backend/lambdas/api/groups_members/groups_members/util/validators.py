# pylint: disable=no-member
from artemisapi.validators import ValidationError
from artemislib.logging import Logger

log = Logger(__name__)

REQUIRED_GROUP_MEMBER_KEYS = {"group_admin"}
REQUIRED_GROUP_MEMBER_LIST_KEYS = {"group_admin", "email"}


def validate_group_members_body(body):
    if body and isinstance(body, dict):
        validate_group_members_body_single(body)
    elif body and isinstance(body, list):
        validate_group_members_body_list(body)
    else:
        raise ValidationError("Requst body is invalid")


def validate_group_members_body_single(body: dict):
    for key in body:
        if key not in REQUIRED_GROUP_MEMBER_KEYS:
            raise ValidationError(f"Unsupported key {key}")

    # group_admin is optional and will default to False
    if not isinstance(body.get("group_admin", False), bool):
        raise ValidationError("admin must be a boolean")


def validate_group_members_body_list(body: list):
    for member in body:
        for key in member:
            if key not in REQUIRED_GROUP_MEMBER_LIST_KEYS:
                raise ValidationError(f"Unsupported key {key}")
        # group_admin is optional and will default to False
        if not isinstance(member.get("group_admin", False), bool):
            raise ValidationError("admin must be a boolean")
        # email must be included when dealing with batch operations
        if not isinstance(member.get("email"), str):
            raise ValidationError("email must be a string")


def validate_group_auth(group_auth, group_id, admin):
    # Artemis Admins do not need checks
    if admin:
        return True
    # Validate the user/apikey has permissions for the group_id passed in.
    if group_id not in group_auth:
        raise ValidationError("User/Key does not have permissions for this group")
    # Return the group_admin permissions the user/key has for this group_id
    return group_auth[group_id]
