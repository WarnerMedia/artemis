from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from sbom_licenses.get import get
from sbom_licenses.util.parsers import parse_event
from sbom_licenses.util.validators import ValidationError


def handler(event, _):
    auth = get_authorizer_info(event)
    if auth["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    try:
        parsed_event = parse_event(event)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if event.get("httpMethod") == "GET":
        resp = get(parsed_event, scope=auth["authz"])
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)

    return resp
