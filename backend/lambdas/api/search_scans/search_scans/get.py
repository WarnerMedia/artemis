from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Repo, Scan
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters, page
from search_scans.util.events import ParsedEvent


def get(event, admin: bool = False, authz: dict = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    # Return the paged list of scans
    return _get_scan_list(paging=parsed_event.paging, admin=admin, scope=authz)


def _get_scan_list(paging: PageInfo, admin: bool = False, scope: dict = False):
    map = FilterMap()
    map.add_string("batch__batch_id", "batch_id")
    map.add_timestamp("created")

    if admin:
        # Admin can get all scans
        qs = Scan.objects.all()
    else:
        # Non-admin can get all scans within their scope
        qs = Scan.objects.filter(repo__in=Repo.in_scope(scope))
    qs = apply_filters(qs, filter_map=map, page_info=paging, default_order=["-created"], distinct=False)

    # Mimic DRF limit-offset paging
    return page(
        qs,
        paging.offset,
        paging.limit,
        "search/scans",
        query_str=paging.query_str,
        to_dict_kwargs={"history_format": True},
    )
