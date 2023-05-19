from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import PageInfo, page
from artemislib.services import get_services_dict
from system_services.util.events import ParsedEvent
from system_services.util.service import Service


def get(event, principal: dict = None, authz: list[list[list[str]]] = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    services = Service.get_services(principal["id"], get_services_dict())

    if parsed_event.item_id:
        if parsed_event.stats_request:
            # Return the stats for a single item
            return get_item(item_id=parsed_event.item_id, services=services, stats_request=True, scope=authz)
        # Return the response for a single item
        return get_item(item_id=parsed_event.item_id, services=services)
    # Return the paged list of items
    return get_item_list(paging=parsed_event.paging, services=services)


def get_item(
    item_id: str,
    services: list[Service],
    stats_request: bool = False,
    scope: list[list[list[str]]] = None,
):
    if stats_request and not scope:
        return response(code=HTTPStatus.NOT_FOUND)

    for service in services:
        if service.name == item_id:
            if stats_request:
                return response(service.stats_to_dict(scope))
            return response(service.to_dict())
    else:
        return response(code=HTTPStatus.NOT_FOUND)


def get_item_list(paging: PageInfo, services: list):
    # Mimic DRF limit-offset paging
    return page(services, paging.offset, paging.limit, "system/services")
