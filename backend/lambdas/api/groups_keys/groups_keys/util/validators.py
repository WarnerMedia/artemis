from fnmatch import fnmatch

from artemisapi.validators import ValidationError, validate_dict_keys, validate_dict_value_type
from artemisdb.artemisdb.models import Group
from artemislib.datetime import from_iso_timestamp
from artemislib.logging import Logger

log = Logger(__name__)

REQUIRED_POST_GROUP_KEYS = ["name", "scope"]
OPTIONAL_POST_GROUP_KEYS = ["features", "expires"]

KEY_OUT_OF_USER_SCOPE = "Requested key scope is not within the user's allowed scope"
INVALID_KEY_PERMISSIONS = "User/Key does not have permissions for this group"
FEATURE_DICT_MESSAGE = "Feature must be an object"


def validate_post_group_key_body(body: dict, group: Group) -> dict:
    validate_dict_keys(body, REQUIRED_POST_GROUP_KEYS, OPTIONAL_POST_GROUP_KEYS)

    if "expires" in body:
        try:
            if not isinstance(body["expires"], str):
                raise ValidationError("Invalid expires value, value must be a string")
            body["expires"] = from_iso_timestamp(body["expires"])
        except ValueError:
            raise ValidationError("Invalid expires value")
    else:
        body["expires"] = None

    # Ensure the scope is a list of strings
    validate_dict_value_type(body, "scope", list, str)

    # lowercase requested scope
    body["scope"] = [scope.lower() for scope in body["scope"]]
    # Make sure we aren't creating a key bigger than the group scope.
    validate_scope(body["scope"], group.scope)
    validate_features(body.get("features", group.features), group.features)

    return body


def validate_scope(scope, authz):
    # Go through every requested scope for the key
    for key_scope in scope:
        # Compare against every scope allowed for the user
        for user_scope in authz:
            # Check the key scope against the user scope
            if fnmatch(key_scope, user_scope):
                # Key scope matches so break the loop and go to the next key scope
                break
        else:
            # No user scopes matched the key scope so raise a validation error
            raise ValidationError(KEY_OUT_OF_USER_SCOPE)


def validate_group_auth(group_auth, group_id, admin):
    # Artemis Admins do not need checks
    if admin:
        return True
    # Validate the user/apikey has permissions for the group_id passed in.
    if group_id not in group_auth:
        raise ValidationError(INVALID_KEY_PERMISSIONS)
    # Return the group_admin permissions the user/key has for this group_id
    return group_auth[group_id]


def validate_features(req_features, auth_features):
    if not isinstance(req_features, dict):
        raise ValidationError(FEATURE_DICT_MESSAGE)
    # The requested features cannot set a key the user doesn't already have set and cannot enable a feature the user
    # doesn't already have enabled. The requested features can, however, disable a feature the user has set.
    for key in req_features:
        if key not in auth_features:
            raise ValidationError(f"Feature {key} cannot be set")
        if not isinstance(req_features[key], bool):
            raise ValidationError(f"Feature {key} must be a boolean")
        elif req_features[key] and not auth_features[key]:
            raise ValidationError(f"Feature {key} cannot be enabled")
