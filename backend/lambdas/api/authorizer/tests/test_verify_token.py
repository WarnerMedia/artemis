import unittest
from unittest.mock import patch

from joserfc.jwk import KeySet

from authorizer.handlers import _verify_claims, _verify_signature

# JWK public key generated locally to be similar to what AWS Cognito generates.
EXAMPLE_JWK_PUBLIC_KEY = {
    "alg": "RS256",
    "e": "AQAB",
    "kid": "6c780a747988cfcd5fb0401553b23f7a2856f6c9",
    "kty": "RSA",
    "n": "0Y54hlQM_nRgUsoiLQ4NJETjZ8p0qVgM86kkC9oZBxxQMAgrlYFuFyYv9HxgcOu5WVqh3KemYiWw0SNBbZTRPWcFW1HPImgAqbNCy-iZrgEs_JDdgqAjEVqAjfq2YAxCBxp6QgNociDornGbMJPzcIihL4Mb8oEvKEh-Tc0hCJuJoJ4yDZTpAVSJR0z4GA-hADL-jKlhWpupLc7n3p04r7BAWZN1MGf7-fRjOfPDf_3Jr0VApv5ALhcYP2unKsglMgIxcxEN0Z6qsnXPHTR1hGceJOqiCFi_eOQEBAJc9dRZEI9x8bwJofmoLmKDYDU3YVzKXTj8AQF4EH6hB3gzvw",
    "use": "sig",
}
EXAMPLE_KEYSET = KeySet.import_key_set({"keys": [EXAMPLE_JWK_PUBLIC_KEY]})
EXAMPLE_APP_ID = "ooGh2xeroJohC6cobaenai7VaiSh3lue"

VALID_CLAIMS = {
    "exp": 32219614800,  # 2990-12-31
    "aud": "ooGh2xeroJohC6cobaenai7VaiSh3lue",
    "email": "jane.doe@example.com",
    "name": "Jane Doe",
}
# Signed JWT representing VALID_CLAIMS.
# Note: The signature is intentionally missing base64 padding.
VALID_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjMyMjE5NjE0ODAwLCJhdWQiOiJvb0doMnhlcm9Kb2hDNmNvYmFlbmFpN1ZhaVNoM2x1ZSIsImVtYWlsIjoiamFuZS5kb2VAZXhhbXBsZS5jb20iLCJuYW1lIjoiSmFuZSBEb2UifQ.baaIlNqtkCMzRbpDJYUYcuRgdy9Yc7kaChQ74gGPSGHFUgmsWm2ddhkR6rOTEAPa60WYiP5sxw4bZ2NOS0fZ0YSU5GYIYTQ_iWq-p-ocdDJjwHuBgQvX4xkw9010XA8wIgrTYWwmPugiBGTVhDP-FsaLScipj96uUQ1B2-h2c7_r4lodPbBmjjbu7FZ08k0upyTAHDQ-BiuE16GNY4ykokVxS3yP4Ujx8u3E6dNKyJsLzDFMcZBQJGHRjRzMK9q54XtWPXy6FtMc8RUmrC__VmjC6AuDpwgD-suBdIyuwMQiNTBR_MTs5b4dI-ParkTan-P8EwhT_GdMXU6kw6q1tw"


@patch("authorizer.handlers.APP_CLIENT_ID", EXAMPLE_APP_ID)
class TestVerifyToken(unittest.TestCase):
    def test_verify_signature_valid(self):
        # Does not raise exception.
        token = _verify_signature(VALID_TOKEN, EXAMPLE_KEYSET)
        self.assertEqual(token.claims, VALID_CLAIMS)

    def test_verify_signature_invalid_token(self):
        with self.assertRaises(Exception) as ex:
            _verify_signature("foo.bar.baz", EXAMPLE_KEYSET)
        self.assertEqual(str(ex.exception), "Unauthorized")

    def test_verify_claims_valid(self):
        # Does not raise exception.
        _verify_claims(VALID_CLAIMS)

    def test_verify_claims_expired(self):
        claims = VALID_CLAIMS.copy()
        claims["exp"] = 631170000  # 1990-01-01
        with self.assertRaises(Exception) as ex:
            _verify_claims(claims)
        self.assertEqual(str(ex.exception), "Unauthorized")

    def test_verify_claims_invalid_app_id(self):
        claims = VALID_CLAIMS.copy()
        claims["aud"] = "foobar"
        with self.assertRaises(Exception) as ex:
            _verify_claims(claims)
        self.assertEqual(str(ex.exception), "Unauthorized")
