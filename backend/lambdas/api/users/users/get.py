from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import User
from artemisdb.artemisdb.paging import page
from users.util.events import ParsedEvent
from users.util.validators import ValidationError


def get(event: dict, email: str = None, authz: list = None, admin: bool = False, features: dict = None):
    try:
        parsed_event = ParsedEvent(event)
    except ValidationError as e:
        return response({"message": e.message}, code=e.code)

    if parsed_event.user_id:
        return get_user(user_id=parsed_event.user_id, email=email, authz=authz, admin=admin, features=features)
    else:
        return get_user_list(
            offset=parsed_event.offset,
            limit=parsed_event.limit,
            filters=parsed_event.filters,
            order_by=parsed_event.order_by,
            email=email,
            admin=admin,
        )


def get_user(user_id, email=None, authz=None, admin: bool = False, features: dict = None):
    user = None
    try:
        if user_id == "self" or user_id == email:
            # Get the user's own record
            user = User.objects.get(email=email, deleted=False)
        elif admin:
            # Admins can pull other user's records
            user = User.objects.get(email=user_id, deleted=False)
    except User.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)

    if not user:
        return response(code=HTTPStatus.NOT_FOUND)

    user_dict = user.to_dict()
    user_dict["scan_orgs"] = user.scan_orgs

    return response(user_dict)


def get_user_list(
    offset: int, limit: int, email: str = None, admin: bool = False, filters: list = None, order_by: list = None
):
    qs = None
    if admin:
        # Admins can see all users
        qs = User.objects.filter(deleted=False)

        if filters:
            # Apply filters
            for filter in filters:
                if filter["field"] == "email":
                    if filter["type"] == "exact":
                        if filter["operation"] == "exclusion":
                            qs = qs.exclude(email=filter["value"])
                        else:
                            qs = qs.filter(email=filter["value"])
                    elif filter["type"] == "contains":
                        qs = qs.filter(email__contains=filter["value"])
                    elif filter["type"] == "icontains":
                        qs = qs.filter(email__icontains=filter["value"])
                elif filter["field"] == "admin":
                    if filter["type"] in ["exact"]:
                        if filter["operation"] == "exclusion":
                            qs = qs.exclude(admin=filter["value"])
                        else:
                            qs = qs.filter(admin=filter["value"])
                elif filter["field"] == "scope":
                    if filter["type"] in ["exact", "contains"]:
                        if filter["operation"] == "exclusion":
                            qs = qs.exclude(scope__contains=filter["value"])
                        else:
                            qs = qs.filter(scope__contains=filter["value"])
                    elif filter["type"] == "icontains":
                        qs = qs.filter(scope__icontains=filter["value"])
                elif filter["field"] == "features":
                    if filter["operation"] == "exclusion":
                        qs = qs.exclude(features__contains={"{}".format(filter["value"].lower()): True})
                    else:
                        qs = qs.filter(features__contains={"{}".format(filter["value"].lower()): True})
                elif filter["field"] == "last_login":
                    if filter["type"] in ["exact", "eq"]:
                        if filter["operation"] == "exclusion":
                            qs = qs.exclude(last_login__eq=filter["value"])
                        else:
                            qs = qs.filter(last_login__eq=filter["value"])
                    elif filter["type"] == "lt":
                        qs = qs.filter(last_login__lt=filter["value"])
                    elif filter["type"] == "gt":
                        qs = qs.filter(last_login__gt=filter["value"])

    elif email:
        # Non-admins can only see themselves
        qs = User.objects.filter(email=email, deleted=False)
    # If not admin and no email then this is being called via legacy API so leave the QuerySet as None

    if qs:
        # order after filtering
        qs = qs.order_by(*order_by)

    return page(qs, offset, limit, "users")
