from fnmatch import fnmatch
from http import HTTPStatus

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import User
from artemislib.logging import Logger

log = Logger(__name__)


def validate_scope(scope: list[str], user_id: str):
    try:
        scan_orgs = User.objects.get(email=user_id, deleted=False).scan_orgs
    except User.DoesNotExist:
        raise ValidationError(HTTPStatus.NOT_FOUND.phrase, HTTPStatus.NOT_FOUND)

    _validate_scope(scope, scan_orgs)


def _validate_scope(scope: list[str], scan_orgs: list[str]):
    if not isinstance(scope, list):
        raise ValidationError("Scope is invalid")
    for item in scope:
        if not isinstance(item, str):
            raise ValidationError("Scope is invalid")

    # This is a special case where the API key can access anything the user
    # has access to. If the API key scope is anything else it has to fall wholly
    # within the scan orgs (validated below).
    if scope == ["*"]:
        return

    # Go through every requested scope for the key
    for key_scope in scope:
        # Loop through all the scan orgs
        for org in scan_orgs:
            # Key scopes are allowed to be defined within the set of scan orgs
            # the user has access to, even if the user has more restricted access
            # than the entire org. The user will still not be allowed to scan
            # repos that they don't have access to. Since user scopes are dynamic
            # through linked accounts this allows API keys to be more flexible at
            # creation but still restricted during use.
            if fnmatch(key_scope, f"{org}/*"):
                break
        else:
            # No scan orgs matched the key scope so raise a validation error
            raise ValidationError("Requested key scope is not within the user's allowed scope")


def validate_admin(req_admin, auth_admin):
    # API keys can't have admin set if the user doesn't have admin permissions
    if req_admin and not auth_admin:
        raise ValidationError("Admin is invalid")


def validate_features(req_features, auth_features):
    # The requested features cannot set a key the user doesn't already have set and cannot enable a feature the user
    # doesn't already have enabled. The requested features can, however, disable a feature the user has set.
    for key in req_features:
        if key not in auth_features:
            raise ValidationError(f"Feature {key} cannot be set")
        if not isinstance(req_features[key], bool):
            raise ValidationError(f"Feature {key} must be a boolean")
        elif req_features[key] and not auth_features[key]:
            raise ValidationError(f"Feature {key} cannot be enabled")
