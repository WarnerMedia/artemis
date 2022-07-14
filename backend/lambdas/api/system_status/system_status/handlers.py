from http import HTTPStatus

from artemisapi.response import response
from system_status.get import get_html, get_json


def handler(event, _):
    if event.get("httpMethod") == "GET":
        if "text/html" in event.get("headers", {}).get("accept", "").lower():
            resp = get_html()
        else:
            resp = get_json()
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)

    return resp
