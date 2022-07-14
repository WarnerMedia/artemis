from http import HTTPStatus

from artemisapi.response import response
from ci_tools.get import get
from ci_tools.util.parsers import parse_event


def handler(event, _):
    parsed_event = parse_event(event)

    if event.get("httpMethod") == "GET":
        return get(parsed_event)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)
