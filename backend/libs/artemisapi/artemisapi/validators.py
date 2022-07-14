from http import HTTPStatus


class ValidationError(Exception):
    def __init__(self, message=HTTPStatus.BAD_REQUEST.phrase, code=HTTPStatus.BAD_REQUEST):
        super().__init__()
        self.message = message
        self.code = code


def validate_dict_keys(d: dict, required: list, optional: list) -> None:
    """
    Validates the keys within a dictionary against the required and optional keys.

    Parameters:
      d:        The dict to validate.
      required: List of keys that must be present in the dict.
      optional: List of keys that may be present in the dict.

    Returns: None
    Throws: ValidationError if a required key is missing or a key that is neither
    required or optional is present.
    """
    keys = d.keys()
    for key in required:
        if key not in keys:
            raise ValidationError(f'Missing key: "{key}"')

    for key in keys:
        if key not in required + optional:
            raise ValidationError(f'Unsupported key: "{key}"')


def validate_dict_value_type(
    d: dict, k: str, t: type, st: type = None, error: str = None, allow_empty: bool = False
) -> None:
    """
    Validates the value within a dictionary meets the type as required by the API

    Parameters:
      d:           The dict to validate.
      k:           The key within the dict to validate.
      t:           The data type that d[k] must be.
      st:          [OPTIONAL] The sub-type that d[k] must contain. Only applicable if t is dict or list.
      error:       [OPTIONAL] Custom error message to use should validation fail.
      allow_empty: [OPTIONAL] Whether the value can be empty. Only applicable if t is str.

    Returns: None
    Raises: Validation error if value at d[k] does not meet requirements.
    """
    if t == str:
        if not isinstance(d.get(k, ""), str):
            raise ValidationError(error or f"{k} must be a string")
        elif not allow_empty and k in d and d[k] == "":
            raise ValidationError(error or f"{k} must be a non-empty string")
    elif t == bool:
        if not isinstance(d.get(k, False), bool):
            raise ValidationError(error or f"{k} must be a boolean")
    elif t == list:
        if not isinstance(d.get(k, []), list):
            raise ValidationError(error or f"{k} must be a list")
        if st is not None:
            for i in d.get(k, []):
                if not isinstance(i, st):
                    raise ValidationError(error or f"{k} must be a list of {st.__name__}")
    elif t == dict:
        if not isinstance(d.get(k, {}), dict):
            raise ValidationError(error or f"{k} must be a dict")
        if st is not None:
            for i in d.get(k, {}):
                if not isinstance(d[k][i], st):
                    raise ValidationError(error or f"{k} must be a dict of {st.__name__}")
