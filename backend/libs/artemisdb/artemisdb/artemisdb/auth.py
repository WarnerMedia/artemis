import uuid
from datetime import datetime, timezone

from django.contrib.auth.hashers import check_password, make_password
from django.db.models import Q

from artemisdb.artemisdb.models import APIKey, Group, User
from artemislib.audit.logger import AuditLogger


def get_api_key(value: str) -> APIKey | None:
    """
    API key format is two UUIDs concatenated with a - in the middle. The first UUID is the key ID and the second UUID
    is the key secret. The key ID is used to lookup the key in the database and the secret is used to verify the key
    is correct.

    This method returns the APIKey object for an API key string. If the API key string is invalid (meaning the APIKey
    object cannot be found) it returns None.
    """
    # Check that the API key passed in is the correct length based on the defined format
    if len(value) != 73:
        return None

    # Break up the ID and secret value
    key_id = value[:36]
    key_secret = value[37:]

    try:
        # Get the API key object where:
        # - The ID part of the value matches the key ID
        # - The key does not belong to a soft-deleted user
        # - The key doesn't have an expiration set or the expiration is still in the future
        key = APIKey.objects.get(
            Q(key_id=key_id),
            Q(user__deleted=False),
            Q(expires=None) | Q(expires__gt=datetime.now(timezone.utc)),
        )
    except APIKey.DoesNotExist:
        return None

    # Check the secret part of the value against the stored hash
    if check_password(key_secret, key.key_hash):
        return key

    return None


def generate_api_key(
    user: User,
    name: str,
    group: Group | None = None,
    expires: datetime | None = None,
    scope: list[str] | None = None,
    admin: bool = False,
    features: dict | None = None,
    audit_log: AuditLogger | None = None,
) -> str:
    """
    API key format is two UUIDs concatenated with a - in the middle. The first UUID is the key ID and the second UUID
    is the key secret. The key ID is used to lookup the key in the database and the secret is used to verify the key
    is correct.

    This method generates a new random API key string associated with the given user.
    """
    # Generate the random components of the key
    key_id = str(uuid.uuid4())
    key_secret = str(uuid.uuid4())

    # Build the full API key
    key = f"{key_id}-{key_secret}"

    # Store the key in the database
    APIKey.objects.create(
        user=user,
        group=group,
        key_id=key_id,
        key_hash=make_password(key_secret),
        name=name,
        expires=expires,
        scope=scope,
        admin=admin,
        features=features or {},
    )

    if audit_log is not None:
        audit_log.key_created(key_id, scope, features or {}, admin, expires, str(group.group_id), group.name)

    return key


def get_api_key_scope(api_key):
    if not api_key:
        return None

    key = get_api_key(api_key)
    if key:
        key.last_used = datetime.now(timezone.utc)
        key.save()
        return key.scope
    return None


def get_principal_group(principal_type: str, principal_id: str) -> Group | None:
    try:
        if principal_type == "group_api_key":
            return Group.objects.get(group_id=principal_id)
        elif principal_type in ("user", "user_api_key"):
            return User.objects.get(email=principal_id).self_group
    except (User.DoesNotExist, Group.DoesNotExist):
        return None
