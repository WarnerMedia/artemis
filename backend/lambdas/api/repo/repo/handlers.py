from http import HTTPStatus

from artemisapi.authorizer import get_authorizer_info
from artemisapi.response import response
from artemisapi.validators import ValidationError
from repo.delete import delete
from repo.get import get
from repo.post import post
from repo.put import put
from repo.util.authorize import authorize
from repo.util.identity import Identity
from repo.util.parse_event import EventParser


def handler(event, _context):
    # This information is set by the API Gateway authorizer after the request is authorized
    auth = get_authorizer_info(event)

    # Build an identity object to hold various information that was set by the authorizer
    identity = Identity(
        auth["principal"]["id"],
        auth["authz"],
        auth["features"],
        auth["scheduler"],
        auth["principal"]["type"],
        auth["allowlist_denied"],
    )

    try:
        event_parser = EventParser(event, identity=identity)
        event_parser.parse_event()
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    # Check if user is authorized to scan repo
    # If we get a response, pass it through
    # Otherwise, no response means user is authorized
    unauthorized = authorize(event_parser)
    if unauthorized:
        return unauthorized

    if event.get("httpMethod") == "GET":
        resp = get(event_parser)
    elif event.get("httpMethod") == "POST":
        resp = post(event_parser)
    elif event.get("httpMethod") == "PUT":
        resp = put(event_parser)
    elif event.get("httpMethod") == "DELETE":
        resp = delete(event_parser)
    else:
        return response(code=HTTPStatus.METHOD_NOT_ALLOWED)
    return resp
