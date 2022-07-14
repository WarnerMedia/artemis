from artemisdb.artemisdb.models import UserService
from artemislib.datetime import format_timestamp, get_utc_datetime
from artemislib.logging import Logger
from artemislib.services import get_services_dict

from update_github_org_users.util.github import get_token, query_users_for_org

LOG = Logger(__name__)
SERVICES_S3_KEY = "services.json"


def handler(event=None, context=None):
    github_username = event.get("github_username")

    # If a GitHub username is given, only process that user
    # Otherwise, process all users
    github_users = []
    if github_username:
        try:
            user_service = UserService.objects.get(username=github_username, service="github")
        except UserService.DoesNotExist:
            LOG.error("No user with associated github username: " + github_username)
            return None

        github_user = {}
        github_user["artemis_user_id"] = user_service.user_id
        github_user["username"] = user_service.username
        github_user["query_name"] = "q1"
        github_users.append(github_user)
    else:
        user_services = UserService.objects.filter(service="github")
        count = 1
        for user_service in user_services:
            github_user = {}
            github_user["artemis_user_id"] = user_service.user_id
            github_user["username"] = user_service.username
            github_user["query_name"] = f"q{count}"
            github_users.append(github_user)
            count += 1

    # Get a list of all GitHub orgs
    services_dict = get_services_dict(SERVICES_S3_KEY)
    orgs = []

    for row in services_dict["scan_orgs"]:
        if row.startswith("github/"):
            orgs += [row.split("/")[1]]

    # Initialize object to store users and corresponding org memberships
    new_scan_orgs = {}
    for github_user in github_users:
        new_scan_orgs[github_user["artemis_user_id"]] = []

    # For each org, check if any of our users are members
    service_secret = services_dict["services"]["github"]["secret_loc"]
    for org in orgs:
        authorization = get_token(org, service_secret)
        query_response = query_users_for_org(authorization, github_users, org)

        for github_user in github_users:
            errors = query_response.get("errors")
            data = query_response.get("data")
            data_user = None
            user_in_organization = None
            if errors:
                LOG.error(errors)
            if data:
                data_user = data.get(github_user["query_name"])
            if data_user:
                user_in_organization = data_user.get("organization")
            if user_in_organization:
                new_scan_orgs[github_user["artemis_user_id"]].append(f"github/{org}")

    # Update scan_orgs in DB
    for user_id in new_scan_orgs:
        userservice_obj = UserService.objects.get(user_id=user_id, service="github")
        timestamp = format_timestamp(get_utc_datetime())
        userservice_obj.scan_orgs = {"orgs": new_scan_orgs[user_id], "updated": timestamp}
        userservice_obj.save()


if __name__ == "__main__":
    handler()
