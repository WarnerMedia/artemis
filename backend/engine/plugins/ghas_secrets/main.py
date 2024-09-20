import json
import subprocess
import uuid
from typing import Tuple

from artemislib.github.api import GitHubAPI
from engine.plugins.lib import utils

LOG = utils.setup_logging("ghas_secrets")


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

    org, repo = args.engine_vars["repo"].split("/", 1)

    gh = GitHubAPI(org, args.engine_vars["service_secret_loc"], args.engine_vars["service_hostname"], repo)

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


def _ghas_secrets_enabled(gh: GitHubAPI) -> bool:
    resp = gh.get_repo()
    return resp.get("security_and_analysis", {}).get("secret_scanning", {}).get("status") == "enabled"


def _ghas_secrets(gh: GitHubAPI, path: str) -> Tuple[list[dict], dict]:
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
                "validity": alert["validity"],
                "state": alert["state"],
                "created_at": alert["created_at"],
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


def _get_alerts(gh: GitHubAPI) -> list[dict]:
    alerts = gh.get_repo("secret-scanning/alerts", query={"state": "open"}, paged=True)
    LOG.info("Retrieved %s alerts", len(alerts))
    return alerts


def _get_locations(gh: GitHubAPI, alert_id: str) -> list[dict]:
    locations = gh.get_repo(f"secret-scanning/alerts/{alert_id}/locations", paged=True)
    LOG.debug("Retrieved %s location(s) for alert %s", len(locations), alert_id)
    return locations


def _validate_location(location: dict, path: str) -> Tuple[bool, str, str]:
    valid = False
    author = None
    author_timestamp = None
    if location["type"] != "commit":
        LOG.debug("Location is not a commit, ignoring")
        return valid, author, author_timestamp

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


if __name__ == "__main__":
    main()
