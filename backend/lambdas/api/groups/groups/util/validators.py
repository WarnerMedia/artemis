# pylint: disable=no-member
from fnmatch import fnmatch
from http import HTTPStatus

from artemisapi.validators import ValidationError, validate_dict_keys, validate_dict_value_type
from artemisdb.artemisdb.helpers.groups import GroupsDBHelper
from artemislib.logging import Logger
from groups.util.messages import (
    ADMIN_INVALID,
    ADMIN_UNAUTHORIZED,
    FEATURE_INVALID,
    NO_PERMISSIONS,
    PARENT_ADMIN_COMBO_INVALID,
    PARENT_NOT_FOUND,
    UNAUTHORIZED_SCOPE,
    USER_KEY_NOT_GROUP_KEY,
    USER_NOT_GROUP_ADMIN,
)

log = Logger(__name__)

MODIFIABLE_GROUP_KEYS = ["name", "description"]
MODIFIABLE_PERMISSION_KEYS = ["scope", "features", "allowlist", "admin"]
REQUIRED_POST_GROUP_KEYS = ["parent", "name", "description", "permissions"]
REQUIRED_PERMISSION_KEYS = ["scope"]
OPTIONAL_PERMISSION_KEYS = ["features", "allowlist", "admin"]


def validate_post_group(body: dict, admin: bool, group_auth: dict):
    if not body or not isinstance(body, dict):
        raise ValidationError()

    validate_dict_keys(body, REQUIRED_POST_GROUP_KEYS, [])
    validate_dict_keys(body["permissions"], REQUIRED_PERMISSION_KEYS, OPTIONAL_PERMISSION_KEYS)

    parent_id = body.get("parent")
    _validate_post_group_user(parent_id, admin, group_auth)
    _validate_body(body, admin)


def _validate_post_group_user(parent_id, admin, group_auth: dict):
    # Group/Artemis Admin Validations
    if admin:
        return
    if not parent_id:
        raise ValidationError(PARENT_ADMIN_COMBO_INVALID, code=HTTPStatus.FORBIDDEN)
    if parent_id not in group_auth:
        raise ValidationError(USER_KEY_NOT_GROUP_KEY, code=HTTPStatus.FORBIDDEN)
    if not group_auth[parent_id]:
        raise ValidationError(USER_NOT_GROUP_ADMIN, code=HTTPStatus.FORBIDDEN)


def _validate_body(body, admin):
    validate_dict_value_type(body, "name", str)
    validate_dict_value_type(body, "description", str, allow_empty=True)
    parent_id = body.get("parent")
    _validate_permissions(parent_id, body.get("permissions") or {}, admin)


def _validate_permissions(parent_id: str, permissions: dict, admin: bool = False) -> None:
    validate_dict_value_type(permissions, "allowlist", bool)
    validate_dict_value_type(permissions, "scope", list, str)
    validate_dict_value_type(permissions, "features", dict, bool)

    # Artemis Admin validations
    validate_dict_value_type(permissions, "admin", bool, error=ADMIN_INVALID)
    if permissions.get("admin", False) and not admin:
        raise ValidationError(ADMIN_UNAUTHORIZED, code=HTTPStatus.FORBIDDEN)

    if "scope" in permissions:
        _validate_post_group_scope(parent_id, permissions["scope"] or [])

    if "features" in permissions:
        _validate_post_group_features(parent_id, permissions["features"])


def _validate_post_group_scope(parent_id, scope: list[str]):
    # compare scope to parent group
    if not parent_id:
        return
    group = GroupsDBHelper().get_group(parent_id)
    if group is None:
        raise ValidationError(PARENT_NOT_FOUND)

    authz = group.scope
    for resource in scope:
        if not _is_scope_valid(resource, authz):
            raise ValidationError(f"{UNAUTHORIZED_SCOPE}: {resource}", code=HTTPStatus.FORBIDDEN)


def _validate_post_group_features(parent_id, features: dict):
    # compare features to parent group
    if not parent_id:
        return
    group = GroupsDBHelper().get_group(parent_id)
    if group is None:
        raise ValidationError(PARENT_NOT_FOUND)

    parent_features = group.features
    for feature, active in features.items():
        if not active:
            continue
        if feature not in parent_features:
            raise ValidationError(f"{FEATURE_INVALID}: {feature}", code=HTTPStatus.FORBIDDEN)
        if not parent_features[feature]:
            raise ValidationError(f"{FEATURE_INVALID}: {feature}", code=HTTPStatus.FORBIDDEN)


def _is_scope_valid(resource, authz):
    """
    Checks if resource is within larger scope (authz)
    return: whether resource is within scope of authz
    """
    for limit in authz:
        if fnmatch(resource, limit):
            return True
    return False


def validate_put_group_body(body: dict, admin: bool = False):
    if not body or not isinstance(body, dict):
        raise ValidationError()

    # On a PUT all keys are optional
    validate_dict_keys(body, [], REQUIRED_POST_GROUP_KEYS)
    validate_dict_keys(body.get("permissions", {}), [], REQUIRED_PERMISSION_KEYS + OPTIONAL_PERMISSION_KEYS)

    _validate_body(body, admin)


def validate_group_auth(group_auth: dict, group_id: str, admin: bool):
    # Artemis Admins do not need checks
    if admin:
        return True
    # Validate the user/apikey has permissions for the group_id passed in.
    if group_id not in group_auth:
        raise ValidationError(NO_PERMISSIONS)
    # Return the group_admin permissions the user/key has for this group_id
    return group_auth[group_id]


def validate_put_scope(parent, scope) -> bool:
    if parent is None:
        return True
    for resource in scope:
        if not _is_scope_valid(resource, parent.scope):
            return False
    if parent.parent:
        return validate_put_scope(parent.parent, scope)
    return True
