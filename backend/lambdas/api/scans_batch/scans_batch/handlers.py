from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from scans_batch.get import get
from scans_batch.post import post


def handler(event, _):
    # This information is set by the API Gateway authorizer after the request is authorized
    event_dict = get_authorizer_info(event)

    if event.get("httpMethod") == "GET":
        return get(event, **event_dict)
    elif event.get("httpMethod") == "POST":
        return post(event, **event_dict)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)
