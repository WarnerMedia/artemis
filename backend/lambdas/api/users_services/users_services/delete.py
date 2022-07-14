from http import HTTPStatus
from typing import Type

from artemisapi.response import response
from artemisdb.artemisdb.models import UserService


def delete(parsed_event: dict) -> Type[response]:
    """
    Delete a linked service for a user
    """
    user_id = parsed_event["user_id"]
    service_id = parsed_event.get("service_id")

    # Delete matching rows, and count of rows deleted
    count, _ = UserService.objects.filter(user__email=user_id, user__deleted=False, service=service_id).delete()

    # If no rows were deleted, return 404
    # Otherwise, return an empty 204 response
    if count == 0:
        return response(code=HTTPStatus.NOT_FOUND)
    return response(code=HTTPStatus.NO_CONTENT)
