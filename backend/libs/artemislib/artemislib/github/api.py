import requests
import sys
from time import sleep, time
from typing import TextIO, Any

from artemislib.env import (
    APPLICATION,
    REV_PROXY_DOMAIN_SUBSTRING,
    REV_PROXY_SECRET,
    REV_PROXY_SECRET_HEADER,
    REV_PROXY_SECRET_REGION,
)
from artemislib.github.app import GithubApp
from artemislib.logging import Logger


class GitHubAPI:
    _instance = None
    _org = ""
    _repo = ""
    _api_url = ""
    _headers = {}
    _log = Logger(__name__)

    def __new__(
        cls,
        org: str,
        github_secret_loc: str,
        service_hostname: str = "",
        repo: str = "",
        log_stream: TextIO = sys.stdout,
    ):
        if not cls._instance:
            cls._instance = super(GitHubAPI, cls).__new__(cls)

            # Store the org and repo for future use
            cls._instance._org = org
            cls._instance._repo = repo

            # Set the auth header
            auth = cls._get_authorization(org, github_secret_loc, log_stream)
            cls._instance._headers = {"Authorization": auth, "Accept": "application/vnd.github+json"}

            # Set the revproxy auth header, if needed
            if service_hostname and REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in service_hostname:
                from artemislib.aws import AWSConnect  # pylint: disable=import-outside-toplevel

                aws_connect = AWSConnect(region=REV_PROXY_SECRET_REGION)
                proxy_secret = aws_connect.get_secret_raw(REV_PROXY_SECRET)
                if proxy_secret:
                    cls._instance._headers[REV_PROXY_SECRET_HEADER] = proxy_secret

            # Set the API URL
            if service_hostname == "" or service_hostname == "api.github.com" or service_hostname is None:
                cls._instance._api_url = "https://api.github.com"
            else:
                cls._instance._api_url = f"https://{service_hostname}/api/v3"

            # Update Logger
            cls._log = Logger(name=__name__, stream=log_stream)
        return cls._instance

    def get_repo(self, path: str = "", query: dict = {}, paged=False) -> Any:
        """Get an API endpoint that is under the /repos/ORG/REPO path"""
        req_path = f"repos/{self._org}/{self._repo}"
        if path != "":
            req_path += f"/{path}"
        return self.get(req_path, query, paged)

    def get(self, path: str = "", query: dict = {}, paged=False):
        """Get an API endpoint from the top level of the API tree"""
        # Build the API path
        url = self._api_url
        if path != "":
            url += f"/{path}"

        if paged:
            query["page"] = 1
            ret = []
            while paged:
                r = requests.get(url=url, headers=self._headers, params=query)
                if int(r.headers.get("X-RateLimit-Remaining", 1)) == 0:
                    self._log.warning("GitHub rate limit reached")
                    self._sleep_until(int(r.headers["X-RateLimit-Reset"]))
                if r.status_code == 200 and r.json():
                    ret += r.json()
                    query["page"] += 1
                else:
                    # Either the status code was not 200 or the JSON response was empty.
                    # When paging is exhaused the API returns 200 with an empty list ("[]") in the body
                    paged = False
            return ret
        else:
            r = requests.get(url=url, headers=self._headers, params=query)
            if int(r.headers.get("X-RateLimit-Remaining", 1)) == 0:
                self._log.warning("GitHub rate limit reached")
                self._sleep_until(int(r.headers["X-RateLimit-Reset"]))
            if r.status_code != 200:
                return {}
            return r.json()

    def get_url(self, url: str, query: dict = {}, paged=False) -> Any:
        """Get an API endpoint from a full URL"""
        # Build the API path

        if paged:
            query["page"] = 1
            ret = []
            while paged:
                r = requests.get(url=url, headers=self._headers, params=query)
                if int(r.headers.get("X-RateLimit-Remaining", 1)) == 0:
                    self._log.warning("GitHub rate limit reached")
                    self._sleep_until(int(r.headers["X-RateLimit-Reset"]))
                if r.status_code == 200 and r.json():
                    ret += r.json()
                    query["page"] += 1
                else:
                    # Either the status code was not 200 or the JSON response was empty.
                    # When paging is exhaused the API returns 200 with an empty list ("[]") in the body
                    paged = False
            return ret
        else:
            r = requests.get(url=url, headers=self._headers, params=query)
            if int(r.headers.get("X-RateLimit-Remaining", 1)) == 0:
                self._log.warning("GitHub rate limit reached")
                self._sleep_until(int(r.headers["X-RateLimit-Reset"]))
            if r.status_code != 200:
                return {}
            return r.json()

    def _sleep_until(self, unix_time: int, max_wait: int = 300):
        wait = unix_time - int(time())
        if wait < 0:
            return
        if wait > max_wait:
            wait = max_wait
        self._log.warning("Sleeping until %s (%s seconds max)", unix_time, wait)
        sleep(wait)

    @staticmethod
    def _get_authorization(org: str, github_secret: str, log_stream: TextIO = sys.stdout) -> str:
        # Attempt to get an app installation token for the organization
        github_app = GithubApp(log_stream=log_stream)
        token = github_app.get_installation_token(org)
        if token is not None:
            return f"token {token}"

        # Fall back to getting the PAT
        key = GitHubAPI._get_api_key(github_secret)
        return f"bearer {key}"

    @staticmethod
    def _get_api_key(service_secret: str):
        from artemislib.aws import AWSConnect  # pylint: disable=import-outside-toplevel

        aws_connect = AWSConnect()
        secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
        if secret:
            return secret.get("key")
        return None
