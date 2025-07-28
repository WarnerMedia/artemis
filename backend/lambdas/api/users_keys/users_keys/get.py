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
    user = User.objects.get(email=email, deleted=False)
    key = user.apikey_set.filter(key_id=key_id).first()
    if not key:
        return response(code=HTTPStatus.NOT_FOUND)

    # Get the serialized key data
    key_data = key.to_dict()

    # Add userEmail field
    key_data["userEmail"] = user.email

    return response(key_data)


def _key_list(email, offset, limit, path_user_id):
    # Determine which user to query
    query_email = email  # Default to the authenticated user

    # If path_user_id is specified and not "self", use that instead
    if path_user_id and path_user_id != "self":
        query_email = path_user_id

    # Get the keys for the user
    try:
        user = User.objects.get(email=query_email, deleted=False)
        keys = user.apikey_set.order_by("-created")

        # Post-processor function to add userEmail to each key
        def add_user_email(obj, item_dict):
            item_dict["userEmail"] = user.email
            return item_dict

        # Use the page function with our post-processor
        return page(keys, offset, limit, f"users/{path_user_id}/keys", post_processor=add_user_email)
    except User.DoesNotExist:
        return response(code=HTTPStatus.NOT_FOUND)
