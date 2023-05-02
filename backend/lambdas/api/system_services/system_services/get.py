from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import PageInfo, page
from artemislib.services import get_services_dict
from system_services.util.events import ParsedEvent
from system_services.util.service import Service


def get(event, principal: dict = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    services = Service.get_services(principal["id"], get_services_dict())

    if parsed_event.item_id:
        # Return the response for a single item
        return get_item(item_id=parsed_event.item_id, services=services)
    # Return the paged list of items
    return get_item_list(paging=parsed_event.paging, services=services)


def get_item(item_id: str, services: list):
    for service in services:
        if service.name == item_id:
            return response(service.to_dict())
    else:
        return response(code=HTTPStatus.NOT_FOUND)


def get_item_list(paging: PageInfo, services: list):
    # Mimic DRF limit-offset paging
    return page(services, paging.offset, paging.limit, "system/services")
