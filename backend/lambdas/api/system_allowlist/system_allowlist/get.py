from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import SystemAllowListItem
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters, page
from system_allowlist.util.events import ParsedEvent


def get(event, **kwargs):
    try:
        parsed_event = ParsedEvent(event, parse_body=False)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.item_id:
        # Return the response for a single item
        return get_item(item_id=parsed_event.item_id)
    # Return the paged list of items
    return get_item_list(paging=parsed_event.paging)


def get_item(item_id):
    try:
        item = SystemAllowListItem.objects.get(item_id=item_id)
    except SystemAllowListItem.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(item.to_dict())


def get_item_list(paging: PageInfo):
    map = FilterMap()
    map.add_string("reason")
    map.add_timestamp("created")
    map.add_timestamp("updated")

    qs = SystemAllowListItem.objects.all()
    qs = apply_filters(qs, filter_map=map, page_info=paging, default_order=["-created"])

    # Mimic DRF limit-offset paging
    return page(qs, paging.offset, paging.limit, "system/allowlist")
