import unittest

from joserfc import jwk
from joserfc.errors import MissingKeyError
import responses
from authorizer.cognito import load_cognito_public_keys

EXAMPLE_REGION = "us-east-1"
EXAMPLE_USERPOOL_ID = "Zoocu9xeieLoTh8RakieL9ai"

EXAMPLE_PUBLIC_KEYS = b"""{
    "keys": [{
        "alg": "RS256",
        "e": "AQAB",
        "kid": "6c780a747988cfcd5fb0401553b23f7a2856f6c9",
        "kty": "RSA",
        "n": "0Y54hlQM_nRgUsoiLQ4NJETjZ8p0qVgM86kkC9oZBxxQMAgrlYFuFyYv9HxgcOu5WVqh3KemYiWw0SNBbZTRPWcFW1HPImgAqbNCy-iZrgEs_JDdgqAjEVqAjfq2YAxCBxp6QgNociDornGbMJPzcIihL4Mb8oEvKEh-Tc0hCJuJoJ4yDZTpAVSJR0z4GA-hADL-jKlhWpupLc7n3p04r7BAWZN1MGf7-fRjOfPDf_3Jr0VApv5ALhcYP2unKsglMgIxcxEN0Z6qsnXPHTR1hGceJOqiCFi_eOQEBAJc9dRZEI9x8bwJofmoLmKDYDU3YVzKXTj8AQF4EH6hB3gzvw",
        "use": "sig"
    }]
}"""

EXPECTED_COGNITO_PUBLIC_KEY_URL = (
    f"https://cognito-idp.{EXAMPLE_REGION}.amazonaws.com/{EXAMPLE_USERPOOL_ID}/.well-known/jwks.json"
)


class TestCognito(unittest.TestCase):
    @responses.activate
    def test_load_cognito_public_keys_valid(self):
        responses.get(
            EXPECTED_COGNITO_PUBLIC_KEY_URL,
            body=EXAMPLE_PUBLIC_KEYS,
        )
        actual = load_cognito_public_keys(EXAMPLE_REGION, EXAMPLE_USERPOOL_ID)
        self.assertIsInstance(actual.get_by_kid("6c780a747988cfcd5fb0401553b23f7a2856f6c9"), jwk.RSAKey)

    @responses.activate
    def test_load_cognito_public_keys_failed(self):
        responses.get(
            EXPECTED_COGNITO_PUBLIC_KEY_URL,
            status=404,
        )
        with self.assertRaises(Exception):
            load_cognito_public_keys(EXAMPLE_REGION, EXAMPLE_USERPOOL_ID)

    @responses.activate
    def test_load_cognito_public_keys_empty(self):
        responses.get(
            EXPECTED_COGNITO_PUBLIC_KEY_URL,
            body=b'{"keys":[]}',
        )
        with self.assertRaises(MissingKeyError):
            load_cognito_public_keys(EXAMPLE_REGION, EXAMPLE_USERPOOL_ID)
