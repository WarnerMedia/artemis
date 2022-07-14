from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from users_services.delete import delete
from users_services.get import get
from users_services.post import post
from users_services.util.parsers import parse_body, parse_event
from users_services.util.validators import ValidationError


def handler(event, context):
    # This information is set by the API Gateway authorizer after the request is authorized
    auth = get_authorizer_info(event)
    if auth["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    email = auth["principal"]["id"]
    admin = auth["admin"]

    try:
        parsed_event = parse_event(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.get("user_id") in (email, "self"):
        is_self = True
        parsed_event["user_id"] = email
    else:
        is_self = False

    if not is_self and not admin:
        return response(code=HTTPStatus.FORBIDDEN)

    if event.get("httpMethod") == "GET":
        resp = get(parsed_event)
    elif event.get("httpMethod") == "POST":
        try:
            post_body = parse_body(event, admin)
        except ValidationError as e:
            return response({"message": e.message}, e.code)
        resp = post(parsed_event, post_body)
    elif event.get("httpMethod") == "DELETE":
        resp = delete(parsed_event)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)

    return resp
