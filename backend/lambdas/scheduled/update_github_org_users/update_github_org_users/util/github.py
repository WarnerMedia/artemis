import os
from typing import Union

import requests
from artemislib.github.app import GithubApp
from artemislib.logging import Logger

log = Logger(__name__)

APPLICATION = os.environ.get("APPLICATION", "artemis")


def get_token(org: str, github_secret: str) -> str:
    """
    Get a GitHub token for a given org
    """
    # Attempt to get an app installation token for the organization
    github_app = GithubApp()
    token = github_app.get_installation_token(org)
    if token is not None:
        return f"token {token}"

    # Fall back to getting the PAT
    key = _get_api_key(github_secret)
    return f"bearer {key}"


def query_users_for_org(authorization: str, github_users: list, org: str) -> Union[bool, dict]:
    """
    Given a list of GitHub users, determine if each is/is not part of a given org
    """
    headers = {"accept": "application/vnd.github.v3+json", "authorization": f"{authorization}"}
    query = "{"

    for github_user in github_users:
        query += f"""{github_user["query_name"]}: user(login: "{github_user["username"]}") {{ organization(login: "{org}") {{ login }} }}"""

    query += "}"

    r = requests.post("https://api.github.com/graphql", json={"query": query}, headers=headers)

    if r.status_code != 200:
        log.error("Non-200 status code returned from GitHub")
        log.error(f"Status Code: {r.status_code}")
        log.error(f"Body: {r.text}")
        return False

    return r.json()


def _get_api_key(service_secret):
    from artemislib.aws import AWSConnect  # pylint: disable=import-outside-toplevel

    aws_connect = AWSConnect()
    secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
    if secret:
        return secret.get("key")
    return None
