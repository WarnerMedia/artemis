from artemisapi.validators import validate_dict_keys, validate_dict_value_type

REQUIRED_POST_KEYS = ["description"]
OPTIONAL_POST_KEYS = []


def validate_post_body(body: dict) -> dict:
    validate_dict_keys(body, REQUIRED_POST_KEYS, OPTIONAL_POST_KEYS)

    # Ensure the description is a string
    validate_dict_value_type(body, "description", str)

    return body
