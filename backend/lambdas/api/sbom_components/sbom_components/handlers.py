from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from artemisapi.validators import ValidationError
from sbom_components.get import get
from sbom_components.util.events import ParsedEvent


def handler(event, _):
    auth = get_authorizer_info(event)
    if auth["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if event.get("httpMethod") == "GET":
        resp = get(parsed_event, scope=auth["authz"])
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)

    return resp
