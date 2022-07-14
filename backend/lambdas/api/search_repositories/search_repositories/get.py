from artemisdb.artemisdb.models import Repo
from artemisdb.artemisdb.paging import page


def get(parsed_event, scope):
    """GET request handler

    API Endpoints handled:
        /search/repositories  -- Filterable repositories search
    """

    # Endpoints:
    #   /search/repositories
    # Returns the paged list of repositories
    return _repository_list(
        offset=parsed_event.get("offset"),
        limit=parsed_event.get("limit"),
        filters=parsed_event.get("filters", []),
        order_by=parsed_event.get("order_by"),
        scope=scope,
    )


def _repository_list(offset: int, limit: int, filters: list, order_by: list, scope: list[list[list[str]]]):
    qs = Repo.in_scope(scope)

    # Apply filters
    for filter in filters:
        if filter["field"] == "repo":
            if filter["type"] == "exact":
                qs = qs.filter(repo=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(repo__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(repo__icontains=filter["value"])
        elif filter["field"] == "service":
            if filter["type"] == "exact":
                qs = qs.filter(service=filter["value"])
            elif filter["type"] == "contains":
                qs = qs.filter(service__contains=filter["value"])
            elif filter["type"] == "icontains":
                qs = qs.filter(service__icontains=filter["value"])
        elif filter["field"] == "risk":
            # Risk is a list of values because it can be specified more than once
            qs = qs.filter(risk__in=filter["value"])
        elif filter["field"] == "last_qualified_scan":
            if filter["type"] == "exact":
                qs = qs.filter(scan__qualified=True, scan__created=filter["value"])
            elif filter["type"] == "lt":
                qs = qs.filter(scan__qualified=True, scan__created__lt=filter["value"])
            elif filter["type"] == "gt":
                qs = qs.filter(scan__qualified=True, scan__created__gt=filter["value"])
            elif filter["type"] == "isnull":
                if filter["value"]:
                    # __isnull=true filters out repos with any qualified scans
                    qs = qs.exclude(scan__qualified=True)
                else:
                    # __isnull=false filters repos with any qualified scans
                    qs = qs.filter(scan__qualified=True)

    # Apply ordering
    if order_by:
        qs = qs.order_by(*order_by)
    else:
        # Default ordering
        qs = qs.order_by("service", "repo")

    qs = qs.distinct()

    return page(
        qs, offset, limit, "search/repositories", {"include_qualified_scan": True, "include_app_metadata": True}
    )
