from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from groups.delete import delete
from groups.get import get
from groups.post import post
from groups.put import put


def handler(event, context):
    # This information is set by the API Gateway authorizer after the request is authorized
    event_dict = get_authorizer_info(event)

    if event_dict["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    if event.get("httpMethod") == "GET":
        return get(event, **event_dict)
    elif event.get("httpMethod") == "PUT":
        return put(event, **event_dict)
    elif event.get("httpMethod") == "POST":
        return post(event, **event_dict)
    elif event.get("httpMethod") == "DELETE":
        return delete(event, **event_dict)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)
