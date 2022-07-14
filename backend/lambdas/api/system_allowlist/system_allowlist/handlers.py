from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from system_allowlist.delete import delete
from system_allowlist.get import get
from system_allowlist.post import post
from system_allowlist.put import put


def handler(event, _):
    # This information is set by the API Gateway authorizer after the request is authorized
    event_dict = get_authorizer_info(event)

    # Admin-only API
    if not event_dict.get("admin", False):
        return response(code=HTTPStatus.FORBIDDEN)

    if event.get("httpMethod") == "GET":
        return get(event, **event_dict)
    elif event.get("httpMethod") == "POST":
        return post(event, **event_dict)
    elif event.get("httpMethod") == "PUT":
        return put(event, **event_dict)
    elif event.get("httpMethod") == "DELETE":
        return delete(event, **event_dict)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)
