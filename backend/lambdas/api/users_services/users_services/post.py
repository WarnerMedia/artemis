from http import HTTPStatus
from typing import Type

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import User
from artemislib.aws import AWSConnect
from artemislib.datetime import format_timestamp
from users_services.util.github import get_github_username


def post(parsed_event: dict, post_body: dict) -> Type[response]:
    """
    Link a new service for a given user
    """
    user_id = parsed_event["user_id"]
    service_id = post_body["name"]
    params = post_body["params"]

    if service_id == "github":
        # Check if github service already exists
        db_user = User.objects.get(email=user_id, deleted=False)
        user_services = [db_service.service for db_service in db_user.userservice_set.all()]

        if service_id in user_services:
            return response({"message": f"Service {service_id} exists for user {user_id}"}, code=HTTPStatus.CONFLICT)

        # Get GitHub username
        if params.get("auth_code"):
            try:
                github_username = get_github_username(params["auth_code"])
            except ValidationError as e:
                return response({"message": e.message}, e.code)

        # If username specified (request made by admin), use the given username
        if params.get("username"):
            github_username = params["username"]

        # Create GitHub service entry for user in DB
        created_row = db_user.userservice_set.create(service=service_id, username=github_username, scan_orgs={})

        # Update scan_orgs for github service user
        aws = AWSConnect()
        aws.invoke_lambda(name="artemis-update-github-org-users", payload={"github_username": github_username})

        # Return created user service
        return response(
            {
                "name": created_row.service,
                "username": created_row.username,
                "linked": format_timestamp(created_row.created),
            }
        )
