from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import Component, Repo, RepoComponentScan
from artemisdb.artemisdb.paging import page


def get(parsed_event, scope):
    """GET request handler

    API Endpoints handled:
        /sbom/components                     -- All components
        /sbom/components/NAME                -- All versions of specific component
        /sbom/components/NAME/VERSION        -- Details of specific version of specific component
        /sbom/components/NAME/VERSION/repos  -- List of repos using this version of specific component
    """
    name = parsed_event["component_name"]
    version = parsed_event["component_version"]
    resource = parsed_event["resource"]

    if resource == "repos":
        # Endpoint:
        #   /sbom/components/NAME/VERSION/repos
        # Return the paged list of repos for a single component
        return _repo_list(
            name=name,
            version=version,
            offset=parsed_event.get("offset"),
            limit=parsed_event.get("limit"),
            filters=parsed_event.get("filters", []),
            order_by=parsed_event.get("order_by"),
            scope=scope,
        )
    elif name and version:
        # Endpoint:
        #   /sbom/components/NAME/VERSION
        # Return the repsonse for a single version of a component
        return _single_component(name=name, version=version, scope=scope)
    else:
        # Endpoints:
        #   /sbom/components
        #   /sbom/components/NAME
        # Returns the paged list of components
        return _component_list(
            name=name,
            offset=parsed_event.get("offset"),
            limit=parsed_event.get("limit"),
            filters=parsed_event.get("filters", []),
            order_by=parsed_event.get("order_by"),
            scope=scope,
        )


def _single_component(name: str, version: str, scope: list[list[list[str]]]):
    qs = RepoComponentScan.objects.filter(component__name=name, component__version=version)
    obj = qs.filter(repo__in=Repo.in_scope(scope)).first()

    if not obj:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(obj.to_dict())


def _component_list(name: str, offset: int, limit: int, filters: list, order_by: list, scope: list[list[list[str]]]):
    if name:
        qs = RepoComponentScan.objects.filter(component__name=name)
        if len(qs) == 0:
            return response(code=HTTPStatus.NOT_FOUND)
    else:
        qs = RepoComponentScan.objects.all()

    qs = qs.filter(repo__in=Repo.in_scope(scope))

    # Apply filters
    for filter in filters:
        if filter["field"] == "name":
            if filter["type"] == "exact":
                qs = qs.filter(component__name=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(component__name__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(component__name__icontains=filter["value"])
        elif filter["field"] == "version":
            if filter["type"] == "exact":
                qs = qs.filter(component__version=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(component__version__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(component__version__icontains=filter["value"])
        elif filter["field"] == "license":
            if filter["type"] == "exact":
                qs = qs.filter(component__licenses__name=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(component__licenses__name__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(component__licenses__name__icontains=filter["value"])
        elif filter["field"] == "repo":
            if filter["type"] == "exact":
                qs = qs.filter(repo__repo=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(repo__repo__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(repo__repo__icontains=filter["value"])
        elif filter["field"] == "service":
            if filter["type"] == "exact":
                qs = qs.filter(repo__service=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(repo__service__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(repo__service__icontains=filter["value"])
        elif filter["field"] == "last_scan":
            if filter["type"] == "exact":
                qs = qs.filter(scan__end_time=filter["value"])
            elif filter["type"] == "lt":
                qs = qs.filter(scan__end_time__lt=filter["value"])
            elif filter["type"] == "gt":
                qs = qs.filter(scan__end_time__gt=filter["value"])

    qs = qs.distinct("component_id")  # This is the components that match all the filters, including repo scope

    # Query for the components that match the filters. This is done as a subquery so that the DB doesn't
    # produce duplicates when custom filtering is applied that would mess up doing .distinct() on RepoComponentScan
    components = Component.objects.filter(pk__in=qs.values_list("component_id", flat=True))

    # Apply ordering
    if order_by:
        components = components.order_by(*order_by)
    else:
        # Default ordering
        components = components.order_by("name")

    api_resource = "sbom/components"
    if name:
        api_resource = f"{api_resource}/{name}"
    return page(components, offset, limit, api_resource)


def _repo_list(
    name: str, version: str, offset: int, limit: int, filters: list, order_by: list, scope: list[list[list[str]]]
):
    qs = RepoComponentScan.objects.filter(component__name=name, component__version=version)
    if len(qs) == 0:
        return response(code=HTTPStatus.NOT_FOUND)

    # Not filtering by repo produces a 25% performance boost for users with unlimited scope when no
    # other filters are applied.
    if scope != ["*"]:
        qs = qs.filter(repo__in=Repo.in_scope(scope))

    # Apply filters
    for filter in filters:
        if filter["field"] == "repo":
            if filter["type"] == "exact":
                qs = qs.filter(repo__repo=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(repo__repo__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(repo__repo__icontains=filter["value"])
        elif filter["field"] == "service":
            if filter["type"] == "exact":
                qs = qs.filter(repo__service=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(repo__service__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(repo__service__icontains=filter["value"])
        elif filter["field"] == "last_scan":
            if filter["type"] == "exact":
                qs = qs.filter(scan__end_time=filter["value"])
            elif filter["type"] == "lt":
                qs = qs.filter(scan__end_time__lt=filter["value"])
            elif filter["type"] == "gt":
                qs = qs.filter(scan__end_time__gt=filter["value"])

    # Query for the repos that match the filters. This is done as a subquery so that the DB doesn't
    # produce duplicates when custom filtering is applied that would mess up doing .distinct() on RepoComponentScan
    repos = Repo.objects.filter(pk__in=qs.values_list("repo_id", flat=True))

    # Apply ordering
    if order_by:
        repos = repos.order_by(*order_by)
    else:
        # Default ordering
        repos = repos.order_by("service", "repo")

    return page(repos, offset, limit, f"sbom/components/{name}/{version}/repos")
