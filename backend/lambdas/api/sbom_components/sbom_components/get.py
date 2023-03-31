from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import Component, Repo, RepoComponentScan
from artemisdb.artemisdb.paging import apply_filters, FilterMap, page


def get(parsed_event, scope):
    """GET request handler

    API Endpoints handled:
        /sbom/components                     -- All components
        /sbom/components/NAME                -- All versions of specific component
        /sbom/components/NAME/VERSION        -- Details of specific version of specific component
        /sbom/components/NAME/VERSION/repos  -- List of repos using this version of specific component
    """

    if parsed_event.resource == "repos":
        # Endpoint:
        #   /sbom/components/NAME/VERSION/repos
        # Return the paged list of repos for a single component
        return _repo_list(
            name=parsed_event.component_name,
            version=parsed_event.component_version,
            paging=parsed_event.paging,
            scope=scope,
        )
    elif parsed_event.component_name and parsed_event.component_version:
        # Endpoint:
        #   /sbom/components/NAME/VERSION
        # Return the repsonse for a single version of a component
        return _single_component(name=parsed_event.component_name, version=parsed_event.component_version, scope=scope)
    else:
        # Endpoints:
        #   /sbom/components
        #   /sbom/components/NAME
        # Returns the paged list of components
        return _component_list(name=parsed_event.component_name, paging=parsed_event.paging, scope=scope)


def _single_component(name: str, version: str, scope: list[list[list[str]]]):
    qs = RepoComponentScan.objects.filter(component__name=name, component__version=version)
    obj = qs.filter(repo__in=Repo.in_scope(scope)).first()

    if not obj:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(obj.to_dict())


def _component_list(name: str, paging, scope: list[list[list[str]]]):
    filter_map = FilterMap()
    if not name:
        filter_map.add_string("component__name", "name")
    filter_map.add_string("component__version", "version")
    filter_map.add_string("component__licenses__name", "license", null=True)
    filter_map.add_string("repo__repo", "repo")
    filter_map.add_string("repo__service", "service")
    filter_map.add_timestamp("scan__end_time", "last_scan")

    if name:
        qs = RepoComponentScan.objects.filter(component__name=name)
        if len(qs) == 0:
            return response(code=HTTPStatus.NOT_FOUND)
    else:
        qs = RepoComponentScan.objects.all()

    qs = qs.filter(repo__in=Repo.in_scope(scope))

    qs = apply_filters(qs, filter_map=filter_map, page_info=paging, apply_ordering=False)

    qs = qs.distinct("component_id")  # This is the components that match all the filters, including repo scope

    # Query for the components that match the filters. This is done as a subquery so that the DB doesn't
    # produce duplicates when custom filtering is applied that would mess up doing .distinct() on RepoComponentScan
    components = Component.objects.filter(pk__in=qs.values_list("component_id", flat=True))

    # Apply ordering
    if paging.order_by:
        components = components.order_by(*paging.order_by)
    else:
        # Default ordering
        components = components.order_by("name")

    api_resource = "sbom/components"
    if name:
        api_resource = f"{api_resource}/{name}"

    return page(components, paging.offset, paging.limit, api_resource, query_str=paging.query_str)


def _repo_list(name: str, version: str, paging, scope: list[list[list[str]]]):
    filter_map = FilterMap()
    filter_map.add_string("repo__repo", "repo")
    filter_map.add_string("repo__service", "service")
    filter_map.add_timestamp("scan__end_time", "last_scan")

    qs = RepoComponentScan.objects.filter(component__name=name, component__version=version)
    if len(qs) == 0:
        return response(code=HTTPStatus.NOT_FOUND)

    qs = qs.filter(repo__in=Repo.in_scope(scope))

    qs = apply_filters(qs, filter_map=filter_map, page_info=paging, apply_ordering=False)

    # Query for the repos that match the filters. This is done as a subquery so that the DB doesn't
    # produce duplicates when custom filtering is applied that would mess up doing .distinct() on RepoComponentScan
    repos = Repo.objects.filter(pk__in=qs.values_list("repo_id", flat=True))

    # Apply ordering
    if paging.order_by:
        repos = repos.order_by(*paging.order_by)
    else:
        # Default ordering
        repos = repos.order_by("service", "repo")

    return page(
        repos, paging.offset, paging.limit, f"sbom/components/{name}/{version}/repos", query_str=paging.query_str
    )
