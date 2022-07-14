from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import License, Repo
from artemisdb.artemisdb.paging import page


def get(parsed_event: dict, scope: list[list[list[str]]]):
    """GET request handler

    API Endpoints handled:
        /sbom/licenses                     -- All licenses
        /sbom/licenses/NAME                -- Specific licenses
    """
    license_id = parsed_event.get("license_id")

    if license_id:
        # Endpoint:
        #   /sbom/license/NAME
        # Return the repsonse for a single license
        return _single_license(license_id=license_id, scope=scope)
    else:
        # Endpoint:
        #   /sbom/licenses
        # Return the paged list of licenses
        return _license_list(
            offset=parsed_event.get("offset"),
            limit=parsed_event.get("limit"),
            filters=parsed_event.get("filters", []),
            order_by=parsed_event.get("order_by"),
            scope=scope,
        )


def _single_license(license_id: str, scope: list[list[list[str]]]):
    license = (
        License.objects.filter(license_id=license_id, component__dependency__scan__repo__in=Repo.in_scope(scope))
        .distinct()
        .first()
    )
    if not license:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(license.to_dict())


def _license_list(offset, limit, filters, order_by, scope: list[list[list[str]]]):
    licenses = License.objects.filter(component__dependency__scan__repo__in=Repo.in_scope(scope)).distinct()

    # Apply filters
    for filter in filters:
        if filter["field"] == "name":
            if filter["type"] == "exact":
                licenses = licenses.filter(name=filter["value"])
            elif filter["type"] == "contains":
                licenses = licenses.filter(name__contains=filter["value"])
            elif filter["type"] == "icontains":
                licenses = licenses.filter(name__icontains=filter["value"])

    # Apply ordering
    for ob in order_by:
        licenses = licenses.order_by(ob)

    return page(licenses, offset, limit, "sbom/licenses")
