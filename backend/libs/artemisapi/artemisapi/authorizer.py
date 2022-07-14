import json
from fnmatch import fnmatch
from json import JSONDecodeError


def get_authorizer_info(event):
    """
    gathers and returns all necessary api key and user information
    """
    try:
        return {
            "principal": json.loads(event["requestContext"]["authorizer"]["principal"]),
            "authz": json.loads(event["requestContext"]["authorizer"].get("scope", "[]")),
            "admin": event["requestContext"]["authorizer"].get("admin", "false") == "true",
            "group_admin": json.loads(event["requestContext"]["authorizer"].get("group_admin", "{}")),
            "features": json.loads(event["requestContext"]["authorizer"].get("features", "{}")),
            "source_ip": event["requestContext"]["identity"]["sourceIp"],
            "scheduler": event["requestContext"]["authorizer"].get("scheduler", "false") == "true",
            "allowlist_denied": json.loads(event["requestContext"]["authorizer"].get("allowlist_denied", "[]")),
        }
    except JSONDecodeError:
        return None


def check_auth(resource: str, authz: list[list[list[str]]]) -> bool:
    # Loop through all of the group chains in the authz
    for group_chain in authz:
        if _group_chain_auth(resource, group_chain):
            return True

    # If we get here no group chain matched so the auth fails
    return False


def _group_auth(resource: str, group: list[str]) -> bool:
    # Loop through all the scopes in a group
    for scope in group:
        if fnmatch(resource, scope):
            # The resource matches a scope
            return True
    # The resource did not match any scopes
    return False


def _group_chain_auth(resource: str, group_chain: list[list[str]]) -> bool:
    # Loop through all the groups in a chain
    for group in group_chain:
        if not _group_auth(resource, group):
            # One of the groups did not match
            return False
    # All of the groups in a chain matched the resource
    return True
