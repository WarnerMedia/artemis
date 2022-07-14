from artemisapi.validators import ValidationError, validate_dict_keys, validate_dict_value_type

TYPES = ["secret"]
REQUIRED_KEYS = ["type", "value", "reason"]
OPTIONAL_KEYS = []
IGNORED_KEYS = ["created", "created_by", "updated", "updated_by"]
SECRET_REQUIRED_KEYS = {}
SECRET_OPTIONAL_KEYS = {"filename": str, "value": str}


def validate_post_body(body: dict) -> dict:
    validate_dict_keys(body, REQUIRED_KEYS, OPTIONAL_KEYS + IGNORED_KEYS)
    if body["type"] not in TYPES:
        raise ValidationError(f"Invalid type: {body['type']}")

    if body["type"] == "secret":
        validate_dict_keys(body["value"], list(SECRET_REQUIRED_KEYS.keys()), list(SECRET_OPTIONAL_KEYS.keys()))

    # Ensure the key value types
    validate_dict_value_type(body, "type", str)
    validate_dict_value_type(body, "reason", str)
    validate_dict_value_type(body, "value", dict, str)

    return body
