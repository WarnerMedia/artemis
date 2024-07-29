from http import HTTPStatus
from typing import Union
from uuid import UUID

from django.db.models import Q
from django.db.models.query import QuerySet

from artemisapi.const import SearchVulnerabilitiesAPIIdentifier
from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Repo, Vulnerability
from artemisdb.artemisdb.paging import Filter, FilterMap, FilterMapItem, FilterType, PageInfo, apply_filters, page
from search_vulnerabilities.util.const import RESOURCE_REPOS_LONG, RESOURCE_REPOS_SHORT
from search_vulnerabilities.util.events import ParsedEvent


def get(event, admin: bool = False, authz: dict = None, **kwargs):
    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, e.code)

    if parsed_event.vuln_id:
        if parsed_event.resource.lower() in (RESOURCE_REPOS_LONG, RESOURCE_REPOS_SHORT):
            # Return the repositories that contain this vuln
            return _get_vuln_repos(vuln_id=parsed_event.vuln_id, paging=parsed_event.paging, admin=admin, scope=authz)
        # Return the response for a single vuln
        return _get_vuln(vuln_id=parsed_event.vuln_id)
    # Return the paged list of scans
    return _get_vuln_list(paging=parsed_event.paging, admin=admin, scope=authz)


def _get_vuln_obj(identifier: str) -> Union[Vulnerability, None]:
    vuln_id = None
    advisory_id = None

    try:
        # If the identifier is a valid UUID set it as the vuln_id
        vuln_id = str(UUID(identifier))
    except ValueError:
        # Otherwise treat the identifier as an advisory ID
        advisory_id = identifier

    try:
        if vuln_id is not None:
            # Get the vuln by vuln_id
            vuln = Vulnerability.objects.get(vuln_id=vuln_id)
        else:
            # Get the vuln by advisory_id
            vuln = Vulnerability.objects.get(advisory_ids__icontains=advisory_id)
    except Vulnerability.DoesNotExist:
        return None

    return vuln


def _get_vuln(vuln_id: str):
    vuln = _get_vuln_obj(vuln_id)
    if vuln is None:
        return response(code=HTTPStatus.NOT_FOUND)

    return response(vuln.to_dict())


def _get_vuln_repos(vuln_id: str, paging: PageInfo, admin: bool = False, scope: dict = False):
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

    vuln = _get_vuln_obj(vuln_id)
    if vuln is None:
        return response(code=HTTPStatus.NOT_FOUND)

    if admin:
        # Admin can get all repos
        qs = Repo.objects.filter(repovulnerabilityscan__in=vuln.repovulnerabilityscan_set.filter(resolved=False))
    else:
        # Non-admin can get all scans within their scope
        qs = Repo.objects.filter(
            pk__in=Repo.in_scope(scope),
            repovulnerabilityscan__in=vuln.repovulnerabilityscan_set.filter(resolved=False),
        )
    qs = apply_filters(
        qs,
        filter_map=map,
        page_info=paging,
        default_order=["service", "repo"],
        api_id=SearchVulnerabilitiesAPIIdentifier.GET_REPOS.value,
    )

    # Mimic DRF limit-offset paging
    return page(
        qs,
        paging.offset,
        paging.limit,
        f"search/vulnerabilities/{vuln_id}/repositories",
        query_str=paging.query_str,
        to_dict_kwargs={"include_qualified_scan": True, "include_app_metadata": True},
    )


def _get_vuln_list(paging: PageInfo, admin: bool = False, scope: dict = False):
    map = FilterMap()
    map.add("vuln_id", filter_type=FilterType.EXACT, item=FilterMapItem("vuln_id", generator=_vuln_id))
    map.add("vuln_id", filter_type=FilterType.CONTAINS, item=FilterMapItem("vuln_id", generator=_vuln_id))
    map.add("vuln_id", filter_type=FilterType.ICONTAINS, item=FilterMapItem("vuln_id", generator=_vuln_id))
    map.add_string("description")
    map.add("severity", filter_type=FilterType.IS_IN)
    map.add_string("remediation")
    map.add_string("components__name", "component_name")
    map.add_string("components__version", "component_version")
    map.add("plugins__name", "plugin", filter_type=FilterType.IS_IN)

    qs = Vulnerability.objects.all()
    qs = apply_filters(
        qs,
        filter_map=map,
        page_info=paging,
        default_order=["-added"],
        api_id=SearchVulnerabilitiesAPIIdentifier.GET_VULNS.value,
    )

    # Mimic DRF limit-offset paging
    return page(qs, paging.offset, paging.limit, "search/vulnerabilities", query_str=paging.query_str)


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


# Filter generation for vuln_id
def _vuln_id(qs: QuerySet, filter: Filter) -> QuerySet:
    # Determine if the filter value is a valid UUID. If it isn't, we have to make sure
    # we don't include a filter on the vuln_id column because if we do Django will throw
    # a ValidationError.
    try:
        UUID(str(filter.value))
        is_uuid = True
    except ValueError:
        is_uuid = False

    # Filter the QuerySet based on the filter type
    if filter.type == FilterType.EXACT:
        q_filter = Q(advisory_ids__contains=filter.value)
        if is_uuid:
            q_filter |= Q(vuln_id=filter.value)
        qs = qs.filter(q_filter)
    elif filter.type == FilterType.CONTAINS:
        q_filter = Q(advisory_ids__icontains=filter.value)
        if is_uuid:
            q_filter |= Q(vuln_id__contains=filter.value)
        qs = qs.filter(q_filter)
    elif filter.type == FilterType.ICONTAINS:
        q_filter = Q(advisory_ids__icontains=filter.value)
        if is_uuid:
            q_filter |= Q(vuln_id__icontains=filter.value)
        qs = qs.filter(q_filter)

    return qs
