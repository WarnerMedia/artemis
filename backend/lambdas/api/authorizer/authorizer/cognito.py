import json

from joserfc import jwk
from joserfc.errors import MissingKeyError
import requests


def load_cognito_public_keys(region: str, userpool_id: str) -> jwk.KeySet:
    """
    Loads the public keys from AWS Cognito and verifies there is at least one key.

    Returns the keyset.
    Raises MissingKeyError if no keys were loaded.
    Raises Exception on any other error.
    """
    url = f"https://cognito-idp.{region}.amazonaws.com/{userpool_id}/.well-known/jwks.json"
    body = requests.get(url).text
    try:
        keys = jwk.KeySet.import_key_set(json.loads(body))
    except MissingKeyError as e:
        raise MissingKeyError(f"No keys imported from: {url}") from e
    return keys
