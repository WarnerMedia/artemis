from http import HTTPStatus
from typing import Type

from artemisapi.response import response
from artemisdb.artemisdb.models import UserService
from artemislib.datetime import format_timestamp


def get(parsed_event: dict) -> Type[response]:
    """
    Get a given user service (if specified)
    Otherwise, return a list of services for a given user
    """
    user_id = parsed_event["user_id"]
    service_id = parsed_event.get("service_id")

    if service_id:
        # If service_id given, check if service exists for user_id
        try:
            user_service = UserService.objects.get(user__email=user_id, service=service_id)
        except UserService.DoesNotExist:
            return response(code=HTTPStatus.NOT_FOUND)

        # Return details of linked service if exists
        return response(
            {
                "name": user_service.service,
                "username": user_service.username,
                "linked": format_timestamp(user_service.created),
            }
        )
    else:
        # Return list of services if service_id not given
        user_services = [
            {
                "name": user_service.service,
                "username": user_service.username,
                "linked": format_timestamp(user_service.created),
            }
            for user_service in UserService.objects.filter(user__email=user_id)
        ]

        return response(user_services)
