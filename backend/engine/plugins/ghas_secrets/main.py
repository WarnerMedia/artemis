import json
import subprocess
import uuid
from collections import namedtuple
from typing import Tuple

import requests

from artemislib.github.app import GithubApp
from artemislib.logging import Logger
from engine.plugins.lib import utils
from engine.plugins.lib.env import (
    APPLICATION,
    REV_PROXY_SECRET_HEADER,
    REV_PROXY_SECRET,
    REV_PROXY_SECRET_REGION,
    REV_PROXY_DOMAIN_SUBSTRING,
)

LOG = Logger("ghas_secrets")

GITHUB_INFO = namedtuple("github_info", ["auth", "api_url", "repo"])


def main():
    args = utils.parse_args()

    results = {
        "success": True,
        "details": [],
        "errors": [],
        "debug": [],
        "event_info": {},
    }

    if args.engine_vars["service_type"] != "github":
        LOG.info("Service type %s is not supported by this plugin", args.engine_vars["service_type"])
        results["debug"].append(f"Service type {args.engine_vars['service_type']} is not supported by this plugin")
        print(json.dumps(results))
        return

    org = args.engine_vars["repo"].split("/", 1)[0]
    auth = _get_authorization(org, args.engine_vars["service_secret_loc"])

    gh = GITHUB_INFO(auth, _api_url(args.engine_vars["service_hostname"]), args.engine_vars["repo"])

    if not _ghas_secrets_enabled(gh):
        LOG.info("Repository does not have GitHub Advanced Security Secret Scanning enabled")
        results["debug"].append("Repository does not have GitHub Advanced Security Secret Scanning enabled")
        print(json.dumps(results))
        return

    results["details"], results["event_info"] = _ghas_secrets(gh, args.path)

    # Update the success boolean based on the presence of details
    results["success"] = not bool(results["details"])

    # Print the results to stdout
    print(json.dumps(results))


def _ghas_secrets_enabled(gh: GITHUB_INFO) -> bool:
    resp = _github_api_get(gh)
    return (
        resp.get("security_and_analysis", {}).get("advanced_security", {}).get("status") == "enabled"
        and resp.get("security_and_analysis", {}).get("secret_scanning", {}).get("status") == "enabled"
    )


def _ghas_secrets(gh: GITHUB_INFO, path: str) -> Tuple[list[dict], dict]:
    results = []
    event_info = {}

    alerts = _get_alerts(gh)
    for alert in alerts:
        locations = _get_locations(gh, alert["number"])
        for location in locations:
            valid, author, author_timestamp = _validate_location(location, path)
            if not valid:
                LOG.debug("Location not valid for this branch")
                continue
            item_id = str(uuid.uuid4())
            item = {
                "id": item_id,
                "filename": location["details"]["path"],
                "line": location["details"]["start_line"],
                "commit": location["details"]["commit_sha"],
                "type": _normalize_secret_type(alert["secret_type"]),
                "author": author,
                "author-timestamp": author_timestamp,
            }
            results.append(item)
            event_info[item_id] = {"match": alert["secret"], "type": item["type"]}

    return results, event_info


def _normalize_secret_type(secret_type: str) -> str:
    # There is a large number of secret types supported by GHAS. Some of them need to be normalized
    # to be aligned with the types returned by other Artemis plugins.
    #
    # https://docs.github.com/en/code-security/secret-scanning/secret-scanning-patterns
    if secret_type.startswith("aws"):
        return "aws"
    elif secret_type.startswith("google"):
        return "google"
    elif "_ssh_" in secret_type:
        return "ssh"
    elif secret_type in ["slack_incoming_webhook_url", "slack_workflow_webhook_url"]:
        return "slack"
    return secret_type  # Keep the original type as a fallthrough


def _get_alerts(gh: GITHUB_INFO) -> list[dict]:
    alerts = _github_api_get(gh, "secret-scanning/alerts", query={"state": "open"}, paged=True)
    LOG.info("Retrieved %s alerts", len(alerts))
    return alerts


def _get_locations(gh: GITHUB_INFO, alert_id: str) -> list[dict]:
    locations = _github_api_get(gh, f"secret-scanning/alerts/{alert_id}/locations", paged=True)
    LOG.debug("Retrieved %s location(s) for alert %s", len(locations), alert_id)
    return locations


def _validate_location(location: dict, path: str) -> Tuple[bool, str, str]:
    valid = False
    author = None
    author_timestamp = None

    r = subprocess.run(
        ["git", "merge-base", "--is-ancestor", location["details"]["commit_sha"], "HEAD"], cwd=path, capture_output=True
    )
    if r.returncode == 0:
        # The commit with the secret is in the current branch
        valid = True
        r = subprocess.run(
            [
                "git",
                "show",
                "--format=%an <%ae>%n%aI",  # Author Name <Author Email>\nISO 8601 Author Date
                "--no-patch",  # Don't care about the diff
                location["details"]["commit_sha"],
            ],
            cwd=path,
            capture_output=True,
        )
        if r.returncode == 0:
            author, author_timestamp = r.stdout.decode("utf-8").strip().split("\n")

    return valid, author, author_timestamp


def _get_authorization(org: str, github_secret: str) -> str:
    # Attempt to get an app installation token for the organization
    github_app = GithubApp()
    token = github_app.get_installation_token(org)
    if token is not None:
        return f"token {token}"

    # Fall back to getting the PAT
    key = _get_api_key(github_secret)
    return f"bearer {key}"


def _get_api_key(service_secret):
    from artemislib.aws import AWSConnect  # pylint: disable=import-outside-toplevel

    aws_connect = AWSConnect()
    secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
    if secret:
        return secret.get("key")
    return None


def _github_api_get(gh: GITHUB_INFO, path: str = None, query: dict = None, paged=False):
    # Query the GitHub API
    headers = {"Authorization": gh.auth, "Content-Type": "application/json"}
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in gh.api_url:
        headers[REV_PROXY_SECRET_HEADER] = GetProxySecret()

    if query is None:
        query = {}

    # Build the API path
    url = f"{gh.api_url}/{gh.repo}"
    if path is not None:
        url += f"/{path}"

    if paged:
        query["page"] = 1
        ret = []
        while paged:
            r = requests.get(url=url, headers=headers, params=query)
            if r.status_code == 200 and r.json():
                ret += r.json()
                query["page"] += 1
            else:
                # Either the status code was not 200 or the JSON response was empty.
                # When paging is exhaused the API returns 200 with an empty list ("[]") in the body
                paged = False
        return ret
    else:
        r = requests.get(url=url, headers=headers, params=query)
        if r.status_code != 200:
            return {}
        return r.json()


def _api_url(service_hostname: str) -> str:
    if service_hostname is None:
        return "https://api.github.com/repos"
    else:
        return f"https://{service_hostname}/api/v3/repos"


class GetProxySecret:
    _secret = None

    def __new__(cls):
        if not cls._secret:
            from repo.util.aws import AWSConnect  # pylint: disable=import-outside-toplevel

            aws_connect = AWSConnect(region=REV_PROXY_SECRET_REGION)
            cls._secret = aws_connect.get_key(REV_PROXY_SECRET)["SecretString"]
        return cls._secret


if __name__ == "__main__":
    main()
