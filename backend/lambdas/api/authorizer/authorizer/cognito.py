import json

from joserfc import jwk
import requests


def load_cognito_public_keys(region: str, userpool_id: str) -> jwk.KeySet:
    """
    Loads the public keys from AWS Cognito and verifies there is at least one key.

    Returns the keyset.
    Raises AssertionError if no keys were loaded.
    Raises Exception on any other error.
    """
    url = f"https://cognito-idp.{region}.amazonaws.com/{userpool_id}/.well-known/jwks.json"
    body = requests.get(url).text
    keys = jwk.KeySet.import_key_set(json.loads(body))
    if len(keys.keys) == 0:
        raise AssertionError(f"No keys imported from: {url}")
    return keys
