from datetime import datetime, timezone
from uuid import UUID

import simplejson as json

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.paging import validate_paging_query
from users_keys.util.validators import validate_admin, validate_features, validate_scope

DEFAULT_PAGE_SIZE = 20


def parse_event(event):
    params = event.get("pathParameters")
    user_id = params.get("id")
    key_id = params.get("kid")
    if not user_id:
        raise ValidationError("User ID is required.")

    if key_id:
        try:
            UUID(key_id)
        except ValueError:
            raise ValidationError("Key ID invalid")

    query = event.get("queryStringParameters") or {}

    if key_id and ("offset" in query or "limit" in query or "end" in query):
        raise ValidationError("Key ID is not compatible with paging")

    offset, limit = validate_paging_query(query)
    end = offset + limit

    return {
        "user_id": user_id,
        "key_id": key_id,
        "offset": offset,
        "limit": limit,
        "end": end,
        "source_ip": event["requestContext"]["identity"]["sourceIp"],
    }


def parse_body(event, admin, features, user_id):
    try:
        body = json.loads(event.get("body") or "{}")
    except json.JSONDecodeError as e:
        raise ValidationError("Error decoding json") from e

    for field in ["name", "scope"]:
        if field not in body:
            raise ValidationError(f"'{field}' is required")

    if "expires" in body:
        try:
            if isinstance(body["expires"], str) and body["expires"].endswith("Z"):
                # Python can't handle parsing Zulu Time so replace it with the UTC offset instead
                body["expires"] = body["expires"].replace("Z", "+00:00")
            body["expires"] = datetime.fromisoformat(body["expires"]).astimezone(tz=timezone.utc)
            now = datetime.now(timezone.utc)
            one_year = now.replace(year=now.year + 1)
            if body["expires"] > one_year:
                raise ValidationError("'expiration' must be at most 1 year from now")
        except (ValueError, TypeError):
            raise ValidationError("Invalid key expiration value")
    else:
        raise ValidationError("'expires' is required")

    validate_scope(body["scope"], user_id)
    validate_admin(body.get("admin", False), admin)
    validate_features(body.get("features", features), features)

    return body
