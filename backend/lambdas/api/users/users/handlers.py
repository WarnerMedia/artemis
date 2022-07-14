from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from artemislib.aws import AWSConnect
from users.delete import delete
from users.get import get
from users.post import post
from users.put import put
from users.util.const import API_KEY_MAP_LOCATION


def handler(event, context):
    # This information is set by the API Gateway authorizer after the request is authorized
    auth = get_authorizer_info(event)
    if auth["principal"]["type"] == "group_api_key":
        # Group API keys are not allowed to use this API
        return response(code=HTTPStatus.FORBIDDEN)

    email = auth["principal"]["id"]
    scope = auth["authz"]
    admin = auth["admin"]
    features = auth["features"]

    if event.get("httpMethod") == "GET":
        return get(event, email=email, authz=scope, admin=admin, features=features)
    elif event.get("httpMethod") == "PUT":
        return put(event, email=email, authz=scope, admin=admin)
    elif event.get("httpMethod") == "POST":
        return post(event, email=email, admin=admin)
    elif event.get("httpMethod") == "DELETE":
        return delete(event, email=email, admin=admin)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)


def get_legacy_api_key_limits(api_key):
    if not api_key:
        return None

    aws_connect = AWSConnect()
    secret = aws_connect.get_secret(API_KEY_MAP_LOCATION)
    if secret:
        return secret.get(api_key)
    return None
