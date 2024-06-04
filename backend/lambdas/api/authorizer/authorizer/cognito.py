import json

from joserfc import jwk
import requests


def load_cognito_public_keys(region: str, userpool_id: str) -> jwk.KeySet:
    """
    Loads the public keys from AWS Cognito.

    Returns the keyset.
    Raises on failure.
    """
    url = f"https://cognito-idp.{region}.amazonaws.com/{userpool_id}/.well-known/jwks.json"
    body = requests.get(url).text
    return jwk.KeySet.import_key_set(json.loads(body))
