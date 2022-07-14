import requests

from artemisapi.validators import ValidationError
from artemislib.creds.link_github_account import get_github_linking_app_creds
from artemislib.logging import Logger
from users_services.util.validators import validate_github_token, validate_github_username

log = Logger(__name__)


def get_github_username(auth_code: str) -> str:
    """
    Return a GitHub username given a GitHub auth code
    """
    token = _get_github_token(auth_code)
    username = _get_github_username(token)
    return username


def _get_github_token(auth_code: str) -> str:
    """
    Exchange GitHub auth code for a token
    """
    secrets = get_github_linking_app_creds()
    client_id = secrets["client_id"]
    client_secret = secrets["client_secret"]

    # Get a GitHub API token
    headers = {"accept": "application/json"}
    params = {"client_id": client_id, "client_secret": client_secret, "code": auth_code}
    r = requests.get("https://github.com/login/oauth/access_token", headers=headers, params=params)
    json_resp = r.json()

    # Handle errors and provide useful logs
    error_conditions = [r.status_code != 200, "error_description" in json_resp, not json_resp.get("access_token")]

    if any(error_conditions):
        log.error("Error occurred attempting to request access_token")

        if r.status_code != 200:
            log.error(f"Status: {r.status_code}")
            log.error(f"Body: {r.text}")

        if "error_description" in json_resp:
            log.error(json_resp["error_description"])
            if json_resp["error"] == "bad_verification_code":
                raise ValidationError("Invalid auth_code param", 400)

        if not json_resp.get("access_token"):
            log.error("Expected access_token in response")

        raise ValidationError("Could not link GitHub account", 500)

    token = json_resp["access_token"]

    validate_github_token(token)

    return token


def _get_github_username(token: str) -> str:
    """
    Using GitHub token, determine the caller's username
    """
    headers = {"accept": "application/vnd.github.v3+json", "authorization": "bearer " + token}
    r = requests.get("https://api.github.com/user", headers=headers)
    json_resp = r.json()

    # Handle errors and provide useful logs
    error_conditions = [r.status_code != 200, not json_resp.get("login")]

    if any(error_conditions):
        log.error("Error occurred attempting to request GitHub user's username")

        if r.status_code != 200:
            log.error(f"Status: {r.status_code}")
            log.error(f"Body: {r.text}")

        if not json_resp.get("login"):
            log.error("Expected login in response")

        raise ValidationError("Could not link GitHub account", 500)

    username = json_resp["login"]

    validate_github_username(username)

    return username
