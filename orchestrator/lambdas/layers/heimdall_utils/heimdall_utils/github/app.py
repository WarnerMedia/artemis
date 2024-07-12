import os

import jwt
import requests
from cryptography.hazmat.primitives import serialization
from aws_lambda_powertools import Logger

from heimdall_utils.aws_utils import get_key
from heimdall_utils.datetime import get_utc_datetime

GITHUB_APP_ID = os.environ.get("HEIMDALL_GITHUB_APP_ID")
GITHUB_PRIVATE_KEY = os.environ.get("HEIMDALL_GITHUB_PRIVATE_KEY", "heimdall/github-app-private-key")


class GithubAppException(Exception):
    pass


class GithubApp:
    _instance = None
    _key = None
    log = None

    def __new__(cls):
        if GITHUB_APP_ID is None:
            raise GithubAppException("GitHub App ID is not set")

        if cls._instance is None:
            cls._instance = super(GithubApp, cls).__new__(cls)
            cls._instance.log = Logger(name=__name__, child=True)

            cls._jwt = None
            cls._jwt_expiration = None

            cls._installation_id_cache = {}
            cls._token_cache = {}

            pem = get_key(GITHUB_PRIVATE_KEY)["SecretString"]
            cls._instance._key = serialization.load_pem_private_key(pem.encode(), password=None)

        return cls._instance

    def _generate_jwt(self) -> None:
        # JWT expiration time (10 minute maximum)
        self._jwt_expiration = int(get_utc_datetime().timestamp()) + (10 * 60)

        # Generate the JWT
        payload = {
            "iat": int(get_utc_datetime().timestamp()) - 60,  # issued at time, 60s in the past to allow for clock drift
            "exp": self._jwt_expiration,
            "iss": GITHUB_APP_ID,  # GitHub App's identifier
        }
        self._jwt = jwt.encode(payload=payload, key=self._key, algorithm="RS256")

    def _jwt_is_valid(self) -> bool:
        if self._jwt is not None and (self._jwt_expiration - 30) > int(get_utc_datetime().timestamp()):
            # JWT exists and we are not within 30 seconds of its expiration (gives some buffer for clock drift)
            return True
        return False

    def _get_installation_id(self, org: str) -> str:
        if org in self._installation_id_cache:
            return self._installation_id_cache[org]

        if not self._jwt_is_valid():
            self._generate_jwt()

        r = requests.get(
            f"https://api.github.com/orgs/{org}/installation",
            headers={"Authorization": f"Bearer {self._jwt}", "Accept": "application/vnd.github.v3+json"},
        )

        if r.status_code == 200:
            installation_id = r.json().get("id")
            self.log.info("Caching GitHub App installation id %s for %s organization", installation_id, org)
            self._installation_id_cache[org] = installation_id

        return self._installation_id_cache.get(org)

    def _get_cached_installation_token(self, org: str) -> str:
        if org not in self._token_cache:
            return None

        token = self._token_cache[org]
        if get_utc_datetime() > token["expires"]:
            # If the token is expired return None so that a new one is generated
            return None

        return token["token"]

    def get_installation_token(self, org: str) -> str:
        token = self._get_cached_installation_token(org)
        if token is not None:
            # Return the cached token because its still valid
            self.log.info("Using cached GitHub App installation token for %s organization", org)
            return token

        if not self._jwt_is_valid():
            self._generate_jwt()

        installation_id = self._get_installation_id(org)
        if installation_id is None:
            self.log.info("GitHub App is not installed in %s organization", org)
            return None

        self.log.info("Generating new GitHub App installation token for %s organization", org)
        r = requests.post(
            f"https://api.github.com/app/installations/{installation_id}/access_tokens",
            headers={"Authorization": f"Bearer {self._jwt}", "Accept": "application/vnd.github.v3+json"},
        )

        if r.status_code == 201:
            self.log.info("Caching generated GitHub App installation token for %s organization", org)
            token = r.json().get("token")
            self._token_cache[org] = {
                "token": token,
                # Tokens are good for an hour. Set the expiration for 59 minutes to account for clock drift
                "expires": get_utc_datetime(offset_minutes=59),
            }
            return token

        self.log.info("Unable to generate GitHub App installation token for %s organization", org)
        return None
