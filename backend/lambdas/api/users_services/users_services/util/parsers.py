from http import HTTPStatus

import simplejson as json

from artemisapi.validators import ValidationError
from users_services.util.validators import validate_github_auth_code, validate_github_username, validate_service


def parse_event(event):
    method = event.get("httpMethod")
    params = event.get("pathParameters")
    user_id = params.get("id")
    service_id = params.get("sid")

    if not user_id:
        raise ValidationError("User ID is required.")

    if method == "DELETE":
        if not service_id:
            raise ValidationError("Service ID is required")
    elif method == "POST":
        if service_id:
            raise ValidationError(HTTPStatus.METHOD_NOT_ALLOWED.phrase, HTTPStatus.METHOD_NOT_ALLOWED)

    if service_id:
        validate_service(service_id)
        return {"user_id": user_id, "service_id": service_id}
    else:
        return {"user_id": user_id}


def parse_body(event, admin):
    body = json.loads(event.get("body") or "{}")

    for field in ["name", "params"]:
        if field not in body:
            raise ValidationError(f"'{field}' is required")

    for field in body:
        if field not in ["name", "params"]:
            raise ValidationError(f"'{field}' is not a valid field.")

    validate_service(body["name"])

    params = body["params"]

    if admin:
        auth_code = params.get("auth_code")
        username = params.get("username")

        conditions = [
            not (auth_code and username),
            auth_code or username,
        ]

        if not all(conditions):
            raise ValidationError("Either auth_code or username param is required")

        # If username was specified, validate it
        if username:
            validate_github_username(username)
    else:
        if params.get("username"):
            raise ValidationError("Must be an admin to pass username param")

        if not params.get("auth_code"):
            raise ValidationError("The auth_code param is required")

        validate_github_auth_code(params.get("auth_code"))

    return body
