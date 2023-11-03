import json

import requests
from artemislib.datetime import get_utc_datetime
from artemislib.db_cache import DBLookupCache
from artemislib.logging import Logger
from repo.github_util.github_utils import _get_authorization
from repo.util.const import SCOPE_CACHE_EXPIRATION_MINUTES, SERVICES_S3_KEY
from repo.util.services import get_services_dict

log = Logger(__name__)


def update_scope_cache(service_user: str, scope_cache: list) -> bool:
    """
    Update scope cache for given service/user and set an expiration
    """
    cache = DBLookupCache()
    expiration = get_utc_datetime(offset_minutes=SCOPE_CACHE_EXPIRATION_MINUTES)
    cache.store(key=f"scope:github:{service_user}", value=json.dumps(scope_cache), expires=expiration)

    return True


def validate_scope_with_github(repo_id: str, service_id: str, service_user: str) -> str:
    """
    Make an API call to GitHub to check if a given user has permission to read a given repo
    """
    org_name = repo_id.split("/")[0]

    services_dict = get_services_dict(SERVICES_S3_KEY)
    secret_loc = services_dict["services"]["github"]["secret_loc"]
    authorization = _get_authorization(org_name, secret_loc)

    headers = {"accept": "application/vnd.github.v3+json", "authorization": authorization}

    log.debug(f"Attempting to validate permissions for github user {service_user} to repo {repo_id}")

    r = requests.get(
        f"https://api.github.com/repos/{repo_id}/collaborators/{service_user}/permission",
        headers=headers,
    )

    log.debug(f"Github request returned status code: {r.status_code}")

    permission = r.json().get("permission")

    if not permission:
        log.error(f"Error occurred attempting to validate permissions for github user {service_user} to repo {repo_id}")
        log.error(f"Status: {r.status_code}")
        log.error(f"Body: {r.text}")

    log.debug(f"Permission returned for user {service_user} to {repo_id}: {permission}")

    return permission in ["admin", "write", "read"]
