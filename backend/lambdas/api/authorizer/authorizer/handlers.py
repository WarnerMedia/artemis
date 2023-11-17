import json
import os
import re
import time
import urllib.request
from datetime import datetime, timezone
from typing import Tuple

from django.db import transaction
from jose import jwk, jwt
from jose.utils import base64url_decode

from artemisdb.artemisdb.auth import get_api_key
from artemisdb.artemisdb.models import APIKey, Group, User, UserService
from artemislib.audit.logger import AuditLogger
from artemislib.db_cache import DBLookupCache
from artemislib.logging import Logger

LOG = Logger("api_authorizer")

REGION = os.environ.get("REGION")
USERPOOL_ID = os.environ.get("USERPOOL_ID")
APP_CLIENT_ID = os.environ.get("APP_CLIENT_ID")
KEYS_URL = "https://cognito-idp.{}.amazonaws.com/{}/.well-known/jwks.json".format(REGION, USERPOOL_ID)

MAINTENANCE_MODE = os.environ.get("ARTEMIS_MAINTENANCE_MODE", "false").lower() == "true"
MAINTENANCE_MODE_MESSAGE = os.environ.get("ARTEMIS_MAINTENANCE_MODE_MESSAGE")
MAINTENANCE_MODE_RETRY_AFTER = os.environ.get("ARTEMIS_MAINTENANCE_MODE_RETRY_AFTER")

# By default give new users access to scan the demo repo
DEFAULT_SCOPE = json.loads(os.environ.get("ARTEMIS_DEFAULT_SCOPE", "[]"))

EMAIL_DOMAIN_ALIASES = json.loads(os.environ.get("EMAIL_DOMAIN_ALIASES", "[]"))

# instead of re-downloading the public keys every time
# we download them only on cold start
# https://aws.amazon.com/blogs/compute/container-reuse-in-lambda/
if REGION is not None and USERPOOL_ID is not None:  # Make sure this doesn't run during loading unit tests
    with urllib.request.urlopen(KEYS_URL) as f:
        url_response = f.read()
    KEYS = json.loads(url_response.decode("utf-8"))["keys"]


def handler(event, _):
    if MAINTENANCE_MODE:
        req_path = event["methodArn"].split(":")[-1].split("/", maxsplit=3)[3]
        if req_path.startswith("api/") or req_path.startswith("ci-tools/"):
            # All API requests bypass the authorizer so that the API will return an HTTP 503
            # response, which this authorizer can't do (it can only succeed or return HTTP 401
            # responses). The authorizer passing along the maintenance information in the
            # authorizer context to be included in the 503 response.
            return response(
                event=event,
                success=True,
                maintenance=True,
                maintenance_message=MAINTENANCE_MODE_MESSAGE,
                maintenance_retry_after=MAINTENANCE_MODE_RETRY_AFTER,
            )
        else:
            # All UI requests are unauthorized while in maintenance mode. The unauthorized
            # response handler will redirect to the user to the maintenance mode status page
            # rather than Cognito while in this state.
            raise Exception("Unauthorized")

    # Not in maintenance mode so process auth request like normal
    try:
        if "id_token" in event.get("headers", {}).get("cookie", "") or "id_token" in event.get("headers", {}).get(
            "Cookie", ""
        ):
            LOG.info("Processing id_token")
            return process_user_auth(event)
        elif "x-api-key" in event.get("headers", {}):
            LOG.info("Processing x-api-key")
            return process_api_key(event)
        else:
            LOG.error("No auth source in request")
            raise Exception("Unauthorized")
    except Exception as e:
        # Anything goes wrong auth fails
        LOG.error(f"Error: {e}")
        raise Exception("Unauthorized")


def process_user_auth(event):
    # Account for inconsistent header capitalization ("Cookie" or "cookie")
    cookie = event["headers"].get("Cookie")  # Capital C Cookie
    if not cookie:
        cookie = event["headers"].get("cookie")  # Just in case check for lowercase c cookie

    # Pull the token value out of the cookie header value
    token = re.sub(r"^.*id_token=([a-zA-Z0-9\-_\.]+).*$", r"\1", cookie)

    # get the key ID (kid) from the headers prior to verification
    headers = jwt.get_unverified_headers(token)
    kid = headers["kid"]

    # search for the kid in the downloaded public keys
    for key in KEYS:
        if kid == key["kid"]:
            break
    else:
        LOG.error("Public key not found in jwks.json")
        raise Exception("Unauthorized")

    # Check the signature
    _verify_signature(token, key)

    # Signature is valid so use the unverified claims
    claims = jwt.get_unverified_claims(token)

    # Check the claims
    _verify_claims(claims)

    # Get the user
    user = _get_update_or_create_user(email=claims["email"].lower())

    if not user:
        raise Exception("Unauthorized")

    # Update the user login timestamp since login was successful
    _update_login_timestamp(user)

    audit_log = AuditLogger(principal=user.email, source_ip=event["requestContext"]["identity"]["sourceIp"])
    audit_log.user_login()

    # Get the group info of the user
    group_admin, scopes, features, allowlist_denied = _get_group_permissions(user)

    # Check for any cached GitHub scopes and create a group containing a list of scopes
    github_scope_cache = _get_scope_cache("github", user.email)
    if github_scope_cache:
        scopes.append([github_scope_cache])

    # If we got this far return success
    return response(
        event=event,
        success=True,
        principal_name=claims["email"].lower(),
        principal_id=user.email,
        principal_type="user",
        group_admin=json.dumps(group_admin),
        scope=json.dumps(scopes),
        admin=user.admin,
        features=json.dumps(features),
        scheduler=False,  # Always false for user logins
        allowlist_denied=allowlist_denied,
    )


def _verify_signature(token: str, key: str):
    # Get the last two sections of the token, message and signature, and decode the signature from base64
    message, encoded_signature = str(token).rsplit(".", 1)
    decoded_signature = base64url_decode(encoded_signature.encode("utf-8"))

    # Construct the public key and verify the signature
    public_key = jwk.construct(key)
    if not public_key.verify(message.encode("utf8"), decoded_signature):
        LOG.error("Signature verification failed")
        raise Exception("Unauthorized")


def _verify_claims(claims: dict):
    # Verify the token expiration
    if time.time() > claims["exp"]:
        LOG.error("Token is expired")
        raise Exception("Unauthorized")

    # Verify the audience (application client ID)
    if claims["aud"] != APP_CLIENT_ID:
        LOG.error("Token was not issued for this audience")
        raise Exception("Unauthorized")


@transaction.atomic
def _get_update_or_create_user(email: str) -> User:
    """
    Attempt to get a user based on email.
    If user does not exist, try to match based on EMAIL_DOMAIN_ALIASES, and update email if successful.
    If a user is still not found, create a new one.
    """
    user = _get_user(email)

    # If user is soft-deleted, return None so that auth fails
    if user and user.deleted:
        return None

    # if user is not found by email, check for aliases
    if not user and EMAIL_DOMAIN_ALIASES:
        email_local_part = email.split("@")[0]
        email_domain = email.split("@")[1]

        # Check if any aliases exist for domain, and attempt to find a match
        for alias in EMAIL_DOMAIN_ALIASES:
            if alias["new_domain"] == email_domain:
                for old_domain in alias["old_domains"]:
                    if alias.get("email_transformation"):
                        transformed_email_local_part = re.sub(
                            alias["email_transformation"]["new_email_regex"],
                            alias["email_transformation"]["old_email_expr"],
                            email_local_part,
                        )
                        old_email = f"{transformed_email_local_part}@{old_domain}"
                    else:
                        old_email = f"{email_local_part}@{old_domain}"

                    user = _get_user(old_email)

                    # If a user is found with an old email (and was not soft-deleted), update the email and return user
                    if user and not user.deleted:
                        user.email = email
                        user.save()

    # if user is found directly or via alias (and was not soft-deleted), ensure that user's self group is named correctly, then return user
    if user and not user.deleted:
        if user.self_group.name != user.email:
            user.self_group.name = user.email
            user.self_group.save()

        return user

    # Create the user since no match has been found at this point
    return _create_user(email)


def _update_login_timestamp(user: User) -> None:
    """
    Set the last login timestamp
    """
    user.last_login = datetime.utcnow().replace(tzinfo=timezone.utc)
    user.save()


def _create_user(email: str) -> User:
    """
    Create a new user
    """
    user = User.objects.create(email=email, scope=DEFAULT_SCOPE)

    # User was created so create their self group as well
    Group.create_self_group(user)

    return user


def _get_user(email: str) -> User:
    """
    Attempt to get a user based on email. Return None if no match found.
    """
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        return None


def _get_group_permissions(user: User) -> Tuple[dict, list, dict, list]:
    """
    Get the consolidated group permissions for a user.

    Parameters:
      user: The user object for which to gather the group permissions.

    Returns: 4-tuple
      dict: Group admin status for groups the user is a member of.
        d["<GROUP_ID>"] = <GROUP_ADMIN_BOOLEAN>
      list: Triple-nested list of group scope chains.
        [
          [
            ["child group scope list"],
            ["parent group scope list"],
            ["grandparent group scope list]
          ],
          [
            ["other group scope list"]
          ]
        ]
      dict: Consolidated mapping of feature flags from all of the user's groups.
        {
          "<FLAG_NAME>": <ENABLED_BOOLEAN>
        }
      list: List of scopes where the user is not permitted to manipulate the AllowList.
        ["scope", "other scope"]
    """
    auth = {}
    scopes = []
    features = {}
    allowlist_denied = []
    for group_membership in user.groupmembership_set.filter(group__deleted=False):
        group = group_membership.group

        # Record whether the user is admin of this group
        auth[str(group.group_id)] = group_membership.group_admin

        # Record the features for this group
        group_id = str(group.group_id)
        features[group_id] = group.features

        # If this group is set to deny allowlisting record the scope of the group
        if not group.allowlist:
            allowlist_denied += group.scope

        # Get the scope chain for this group
        group = group_membership.group
        group_scopes = []
        while group is not None:
            group_scopes.append(group.scope)

            # Check if any features need to be disabled
            for flag in group.features:
                if flag in features[group_id] and not group.features[flag]:
                    # Feature has been turned off in a parent group so override it to be off here
                    features[group_id][flag] = False

            group = group.parent

        # Add this scope chain to the list of scope chains
        scopes.append(group_scopes)

    consolidated_features = {}
    for gid in features:
        for flag in features[gid]:
            if flag not in consolidated_features:
                consolidated_features[flag] = features[gid][flag]
            elif features[gid][flag]:
                # Enabled by any group means enabled for this user
                consolidated_features[flag] = True

    return auth, scopes, consolidated_features, list(set(allowlist_denied))


def _get_api_key_group_permissions(key: APIKey) -> Tuple[list, dict, list]:
    """
    Get the consolidated group permissions for an API key.

    Parameters:
      key: The API key object for which to gather the group permissions.

    Returns: 3-tuple
      list: Triple-nested list of group scope chains.
        [
          [
            ["child group scope list"],
            ["parent group scope list"],
            ["grandparent group scope list]
          ]
        ]
      dict: Consolidated mapping of feature flags from all of the API key's groups.
        {
          "<FLAG_NAME>": <ENABLED_BOOLEAN>
        }
      list: List of scopes where the API key is not permitted to manipulate the AllowList.
        ["scope", "other scope"]
    """
    scopes = []
    features = {}
    allowlist_denied = []

    group = key.group

    # Record the features for this group
    features = group.features

    # If this group is set to deny allowlisting record the scope of the group
    if not group.allowlist:
        allowlist_denied += group.scope

    # If this is a user key (tied to a self group) get the allowlist status for the user's groups
    if group.self_group:
        for user_group in group.created_by.groups.filter(deleted=False, allowlist=False):
            allowlist_denied += user_group.scope

    if group.self_group:
        # The key is a user API key so gather the scopes for all the groups the user is in to process
        groups = group.created_by.groups.filter(deleted=False)
    else:
        # The key is a group API key so only process the group chain for the key's group
        groups = Group.objects.filter(pk=group.pk)

    for group in groups:
        # Start with the key's scope as that limit applies to all of the groups
        group_scopes = [key.scope]

        # Get the scope chain for this group
        while group is not None:
            group_scopes.append(group.scope)

            # If this is a user key check for any cached GitHub scopes and include them with the
            # self group scopes
            if group.self_group:
                group_scopes[-1] += _get_scope_cache("github", group.created_by.email)

            # Check if any features need to be disabled
            for flag in group.features:
                if flag in features and not group.features[flag]:
                    # Feature has been turned off in a parent group so override it to be off here
                    features[flag] = False

            group = group.parent

        # Add this scope chain to the list of scope chains but only if there is not an empty scope in the chain
        if [] not in group_scopes:
            scopes.append(group_scopes)
        else:
            scopes.append([[]])

    return scopes, features, list(set(allowlist_denied))


def process_api_key(event):
    api_key_value = event.get("headers", {}).get("x-api-key")

    api_key = get_api_key(api_key_value)
    if api_key:
        api_key.last_used = datetime.utcnow().replace(tzinfo=timezone.utc)
        api_key.save()
        audit_log = AuditLogger(principal=api_key.user.email, source_ip=event["requestContext"]["identity"]["sourceIp"])
        audit_log.key_login(key_id=str(api_key.key_id))

        scopes, features, allowlist_denied = _get_api_key_group_permissions(api_key)
        return response(
            event=event,
            success=True,
            principal_name=f"{api_key.name} ({api_key.group.name})",
            principal_id=api_key.group.name if api_key.group.self_group else str(api_key.group.group_id),
            principal_type="user_api_key" if api_key.group.self_group else "group_api_key",
            group_admin=False,  # API keys can't have group admin
            scope=json.dumps(scopes),
            admin=api_key.admin,
            features=json.dumps(features),
            scheduler=api_key.scheduler,
            allowlist_denied=allowlist_denied,
        )

    raise Exception("Unauthorized")


def response(
    event: dict,
    success: bool,
    principal_name: str = None,
    principal_id: str = None,
    principal_type: str = None,
    group_admin: str = None,
    scope: str = None,
    use_email: bool = False,
    admin: bool = False,
    features: str = None,
    scheduler: bool = False,
    maintenance: bool = False,
    maintenance_message: str = None,
    maintenance_retry_after: str = None,
    allowlist_denied: list = None,
):
    # Since we're caching the auth determination for a few minutes build a resource ARN that allows all of the API
    # so that the cached response will work for multiple API resources.
    region = event["methodArn"].split(":")[3]
    resource = (
        f"arn:aws:execute-api:{region}:{event['requestContext']['accountId']}:"
        f"{event['requestContext']['apiId']}/{event['requestContext']['stage']}/*"
    )

    # Return the authorizer response dict
    return {
        "principalId": principal_id if use_email else event["requestContext"]["identity"]["userArn"],
        "policyDocument": {
            "Version": "2012-10-17",
            "Statement": [
                {"Action": "execute-api:Invoke", "Effect": "Allow" if success else "Deny", "Resource": resource}
            ],
        },
        "context": {
            "principal": json.dumps({"name": principal_name, "id": principal_id, "type": principal_type}),
            "group_admin": group_admin or "{}",
            "scope": scope,
            "admin": admin,
            "features": features or "{}",
            "scheduler": scheduler,
            "maintenance_mode": maintenance,
            "maintenance_mode_message": maintenance_message,
            "maintenance_mode_retry_after": maintenance_retry_after,
            "allowlist_denied": json.dumps(allowlist_denied) or "[]",
        },
    }


def _get_scope_cache(service_id: str, email: str) -> list:
    """
    Look up scope cache for a given service/user if any exists
    """
    try:
        service_user = UserService.objects.get(user__email=email)
    except UserService.DoesNotExist:
        return []

    if service_id == "github":
        cache = DBLookupCache()
        scope_cache = cache.lookup(key=f"scope:{service_id}:{service_user.username}")

        # Check if user has any scopes cached
        if scope_cache:
            return json.loads(scope_cache)
    return []
