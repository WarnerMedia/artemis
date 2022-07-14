# pylint: disable=no-member
from artemisapi.validators import ValidationError
from artemislib.logging import Logger

log = Logger(__name__)

MODIFIABLE_USER_KEYS = ["scope", "admin", "features"]


def validate_post_body(body: dict):
    if not body or not isinstance(body, dict):
        raise ValidationError("Requst body is invalid")

    for key in body:
        if key not in MODIFIABLE_USER_KEYS:
            raise ValidationError(f"Unsupported key {key}")

    if not isinstance(body.get("admin", False), bool):
        raise ValidationError("admin must be a boolean")

    if not isinstance(body.get("scope", []), list):
        raise ValidationError("scope must be a list of strings")

    for item in body.get("scope", []):
        if not isinstance(item, str):
            raise ValidationError("scope must be a list of strings")

    if not isinstance(body.get("features", {}), dict):
        raise ValidationError("features must be a dictionary")

    for item in body.get("features", {}):
        if not isinstance(body.get("features", {})[item], bool):
            raise ValidationError("features values must be a boolean")
