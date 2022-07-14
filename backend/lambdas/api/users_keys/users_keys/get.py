from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import User
from artemisdb.artemisdb.paging import page


def get(parsed_event, email=None):
    key_id = parsed_event.get("key_id")

    if key_id:
        # Return the repsonse for a single key
        return _single_key(email=email, key_id=key_id)
    else:
        # Return the paged list of keys
        return _key_list(
            email=email,
            offset=parsed_event.get("offset"),
            limit=parsed_event.get("limit"),
            path_user_id=parsed_event.get("user_id"),
        )


def _single_key(email, key_id):
    key = User.objects.get(email=email, deleted=False).apikey_set.filter(key_id=key_id).first()
    if not key:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(key.to_dict())


def _key_list(email, offset, limit, path_user_id):
    # Get the keys for the user
    try:
        keys = User.objects.get(email=email, deleted=False).apikey_set.order_by("-created")
        return page(keys, offset, limit, f"users/{path_user_id}/keys")
    except User.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)
