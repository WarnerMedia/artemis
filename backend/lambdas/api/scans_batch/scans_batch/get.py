from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Group, ScanBatch, User
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters, page
from scans_batch.util.events import ParsedEvent


def get(event, principal: dict = None, admin: bool = False, **kwargs):
    principal_group = None
    if not admin:
        try:
            if principal["type"] == "group_api_key":
                principal_group = Group.objects.get(group_id=principal["id"])
            else:
                principal_group = User.objects.get(email=principal["id"]).self_group
        except (Group.DoesNotExist, User.DoesNotExist):
            return response(code=HTTPStatus.FORBIDDEN)

    try:
        parsed_event = ParsedEvent(event, parse_body=False)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.batch_id:
        # Return the response for a single batch
        return get_batch(batch_id=parsed_event.batch_id, principal_group=principal_group, admin=admin)
    # Return the paged list of batches
    return get_batch_list(paging=parsed_event.paging, principal_group=principal_group, admin=admin)


def get_batch(batch_id, principal_group: Group = None, admin: bool = False):
    try:
        if admin:
            # Admin can get any batch
            batch = ScanBatch.objects.get(batch_id=batch_id)
        else:
            # Non-admin can only get batch if the principal created it
            batch = ScanBatch.objects.get(batch_id=batch_id, created_by=principal_group)
    except ScanBatch.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    return response(batch.to_dict(include_stats=True))


def get_batch_list(paging: PageInfo, principal_group: Group = None, admin: bool = False):
    map = FilterMap()
    map.add_string("description")
    map.add_timestamp("created")

    if admin:
        # Admin can get all batches
        qs = ScanBatch.objects.all()
    else:
        # Non-admin can get all batches created by the principal
        qs = ScanBatch.objects.filter(created_by=principal_group)
    qs = apply_filters(qs, filter_map=map, page_info=paging, default_order=["-created"])

    # Mimic DRF limit-offset paging
    return page(qs, paging.offset, paging.limit, "scans/batch")
