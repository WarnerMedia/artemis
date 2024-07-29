from django.db.models.query import QuerySet

from artemisapi.const import SearchRepositoriesAPIIdentifier
from artemisdb.artemisdb.models import Repo
from artemisdb.artemisdb.paging import Filter, FilterMap, FilterMapItem, FilterType, PageInfo, apply_filters, page


def get(parsed_event, scope):
    """GET request handler

    API Endpoints handled:
        /search/repositories  -- Filterable repositories search
    """

    # Endpoints:
    #   /search/repositories
    # Returns the paged list of repositories
    return _get_repos(parsed_event.paging, scope)


def _get_repos(paging: PageInfo, scope: list[list[list[str]]]):
    map = FilterMap()
    map.add_string("repo")
    map.add_string("service")
    map.add("risk", filter_type=FilterType.IS_IN)

    # Add items to the filter map for last_qualified_scan time
    for filter_type in [FilterType.EXACT, FilterType.GREATER_THAN, FilterType.LESS_THAN]:
        map.add(
            "scan__created",
            "last_qualified_scan",
            filter_type,
            FilterMapItem(f"scan__created__{filter_type.value}", others=[FilterMapItem("scan__qualified", value=True)]),
        )

    map.add(
        "last_qualified_scan",
        filter_type=FilterType.IS_NULL,
        item=FilterMapItem("last_qualified_scan", generator=_last_qualified_scan_isnull),
    )

    qs = Repo.in_scope(scope)

    qs = apply_filters(
        qs,
        filter_map=map,
        page_info=paging,
        default_order=["service", "repo"],
        api_id=SearchRepositoriesAPIIdentifier.GET.value,
    )

    # Mimic DRF limit-offset paging
    return page(
        qs,
        paging.offset,
        paging.limit,
        "search/repositories",
        query_str=paging.query_str,
        to_dict_kwargs={"include_qualified_scan": True, "include_app_metadata": True},
    )


###############################################################################
# Filter generation methods
###############################################################################


# Filter generation method for last qualified scan time being null
def _last_qualified_scan_isnull(qs: QuerySet, filter: Filter) -> QuerySet:
    if filter.value:
        qs = qs.exclude(scan__qualified=True)
    else:
        qs = qs.filter(scan__qualified=True)
    return qs
