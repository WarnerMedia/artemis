from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from users_keys.delete import delete
from users_keys.get import get
from users_keys.post import post
from users_keys.util.parsers import parse_body, parse_event
from users_keys.util.validators import ValidationError


def handler(event, context):
    # This information is set by the API Gateway authorizer after the request is authorized
    auth = get_authorizer_info(event)
    if auth["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    email = auth["principal"]["id"]
    admin = auth["admin"]
    features = auth["features"]

    try:
        parsed_event = parse_event(event)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    # Allow admins to access any user's keys, but restrict non-admins to their own
    if parsed_event.get("user_id") not in (email, "self") and not admin:
        return response(code=HTTPStatus.FORBIDDEN)

    if event.get("httpMethod") == "GET":
        resp = get(parsed_event, email=email)
    elif event.get("httpMethod") == "POST":
        try:
            post_body = parse_body(event, admin, features, email)
        except ValidationError as e:
            return response({"message": e.message}, code=e.code)
        resp = post(parsed_event, post_body, email=email, features=features)
    elif event.get("httpMethod") == "DELETE":
        resp = delete(parsed_event, email=email)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)

    return resp
