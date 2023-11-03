from fnmatch import fnmatch
from http import HTTPStatus

from artemisapi.response import response
from artemisdb.artemisdb.models import UserService
from artemislib.logging import Logger
from repo.util.parse_event import EventParser
from repo.util.scope import update_scope_cache, validate_scope_with_github
from repo.util.utils import auth

log = Logger(__name__)


def authorize(event_parser: EventParser) -> dict:
    """
    Check if user is authorized to scan a repo
    """
    identity = event_parser.identity
    parsed_event = event_parser.parsed_event
    repo_id = parsed_event.get("repo_id")
    service_id = parsed_event.get("service_id")
    scope_cache = []

    if repo_id:
        # Validate user's scope allows this repo
        allowed = auth(repo_id, service_id, identity.scope)

        if not allowed and service_id == "github" and identity.principal_type != "group_api_key":
            # If not allowed and not a group API key, check permission with GitHub
            log.debug(
                f"{identity.principal_id} does not have static or cached scope to {repo_id}, checking for Github access"
            )
            try:
                github_account = UserService.objects.get(
                    user__email=identity.principal_id, user__deleted=False, service="github"
                )
                github_username = github_account.username
            except UserService.DoesNotExist:
                log.debug(f"Linked Github account not found for {identity.principal_id}")
                return response({"message": f"Not authorized for {repo_id}"}, code=HTTPStatus.FORBIDDEN)

            log.debug(f"Linked Github account found for {identity.principal_id}, validating Github access to {repo_id}")
            validated = validate_scope_with_github(repo_id, service_id, github_username)

            if validated:
                log.debug(
                    f"Linked Github account found for {identity.principal_id} has access to {repo_id}, updating scope cache"
                )
                scope_cache += [f"github/{repo_id}"]
                update_scope_cache(github_username, scope_cache)

                if identity.principal_type == "user_api_key":
                    # Re-check the repo against the updated scope. We don't know if the
                    # previous auth check failed because the repo was outside of the key's
                    # scope or outside of the user's group scope. Now that we know that the
                    # user has access to the repo via their linked GitHub account we need to
                    # check if the repo is in the key's scope.
                    #
                    # User keys have this scope structure:

                    # [
                    #   [
                    #     ["key scope list"],
                    #     ["self group scope list"]
                    #   ]
                    # ]
                    #
                    # This adds the additional scope from GitHub to be at the same level as
                    # the scopes from the self group so that they are given equal consideration
                    # and the group scope does not limit what was verified with GitHub but is
                    # still restricted by the key's own scope.

                    log.debug(f"Checking if {repo_id} in API key scope {identity.scope} for {identity.principal_id}")
                    identity.scope[0][1] += [f"github/{repo_id}"]
                    allowed = auth(repo_id, service_id, identity.scope)
                    if allowed:
                        log.debug(f"Repo {repo_id} in key scope")
                    else:
                        log.debug(f"Repo {repo_id} not in key scope")
                else:
                    # Users have this scope structure:
                    # [
                    #   [
                    #     ["self group scope list"]
                    #   ],
                    #   [
                    #     ["other group scope list"],
                    #     ["other group parent scope list"]
                    #   ]
                    # ]
                    #
                    # This adds the additional scope from GitHub as if it were another group.
                    identity.scope.append([[f"github/{repo_id}"]])
                    allowed = True  # Don't need to re-check the auth for users

        allowed = allowed and not allowlist_is_denied(
            event_parser.event.get("httpMethod"),
            parsed_event["resource"],
            service_id,
            repo_id,
            identity.allowlist_denied,
        )

        # If still not allowed, user is unauthorized
        if not allowed:
            return response({"message": f"Not authorized for {repo_id}"}, code=HTTPStatus.FORBIDDEN)

        log.debug(f"{identity.principal_id} authorized to {repo_id}")


def allowlist_is_denied(method: str, resource: str, service: str, repo: str, allowlist_denied: list):
    if method in ["POST", "PUT", "DELETE"] and resource == "whitelist":
        # The user is attempting to make allowlist changes so check that they are not in a group that
        # denies making allowlist changes to this repo.
        for scope in allowlist_denied:
            if fnmatch(f"{service}/{repo}".lower(), scope):
                return True
    return False
