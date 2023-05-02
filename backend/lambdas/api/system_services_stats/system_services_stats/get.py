from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from system_services_stats.util.events import ParsedEvent
from system_services_stats.util.service import get_services


def get(event, principal: dict = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    # Get the services the user has access to within their authz scope
    services = get_services(principal["id"])

    # Return the stats for a service
    return get_stats(item_id=parsed_event.item_id, services=services)


def get_stats(item_id: str, services: list):
    if item_id in services:
        # TODO Implementation
        return response({})
    else:
        return response(code=HTTPStatus.NOT_FOUND)
