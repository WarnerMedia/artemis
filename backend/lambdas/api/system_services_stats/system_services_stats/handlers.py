from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from system_services_stats.get import get


def handler(event, _):
    # This information is set by the API Gateway authorizer after the request is authorized
    auth = get_authorizer_info(event)
    if auth["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    if event.get("httpMethod") == "GET":
        return get(event, **auth)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)
