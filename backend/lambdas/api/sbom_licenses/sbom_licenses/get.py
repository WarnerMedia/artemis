from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import License, Repo
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters, page


def get(parsed_event, admin: bool = False, scope: list[list[list[str]]] = None, **kwargs):
    """GET request handler

    API Endpoints handled:
        /sbom/licenses                     -- All licenses
        /sbom/licenses/NAME                -- Specific licenses
    """
    if parsed_event.license_id:
        # Endpoint:
        #   /sbom/license/NAME
        # Return the repsonse for a single license
        return _single_license(license_id=parsed_event.license_id, admin=admin, scope=scope)
    else:
        # Endpoint:
        #   /sbom/licenses
        # Return the paged list of licenses
        return _license_list(parsed_event.paging, admin=admin, scope=scope)


def _single_license(license_id: str, admin: bool = False, scope: list[list[list[str]]] = None):
    if admin:
        license = License.objects.filter(license_id=license_id).first()
    else:
        license = (
            License.objects.filter(license_id=license_id, component__repocomponentscan__repo__in=Repo.in_scope(scope))
            .distinct()
            .first()
        )
    if not license:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(license.to_dict())


def _license_list(paging: PageInfo, admin: bool = False, scope: list[list[list[str]]] = None):
    map = FilterMap()
    map.add_string("name")

    if admin:
        # Admin can get all licenses
        qs = License.objects.all()
    else:
        # Non-admin can get all licenses within their scope
        qs = License.objects.filter(component__repocomponentscan__repo__in=Repo.in_scope(scope))

    qs = apply_filters(qs, filter_map=map, page_info=paging, default_order=["name"], distinct=True)

    # Mimic DRF limit-offset paging
    return page(qs, paging.offset, paging.limit, "sbom/licenses", query_str=paging.query_str)
