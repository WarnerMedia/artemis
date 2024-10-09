import json
import uuid
import sys

from artemislib.github.api import GitHubAPI
from engine.plugins.lib import utils
from engine.plugins.ghas_secrets.formatter import format_secret
from engine.plugins.ghas_secrets.validator import validate

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

    gh = GitHubAPI(
        org, args.engine_vars["service_secret_loc"], args.engine_vars["service_hostname"], repo, log_stream=sys.stderr
    )

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


def _ghas_secrets(gh: GitHubAPI, path: str) -> tuple[list[dict], dict]:
    results = []
    event_info = {}

    alerts = _get_alerts(gh)
    for alert in alerts:
        locations = _get_locations(gh, alert["number"])
        for location in locations:
            valid, author, author_timestamp = validate(location, path)
            if not valid:
                LOG.debug("Location not valid for this branch")
                continue
            item_id = str(uuid.uuid4())
            item = format_secret(gh, item_id, location, alert, author, author_timestamp)
            if item:
                results.append(item)
                event_info[item_id] = {"match": alert["secret"], "type": item["type"]}

    return results, event_info


def _get_alerts(gh: GitHubAPI) -> list[dict]:
    alerts = gh.get_repo("secret-scanning/alerts", query={"state": "open"}, paged=True)
    LOG.info("Retrieved %s alerts", len(alerts))
    return alerts


def _get_locations(gh: GitHubAPI, alert_id: str) -> list[dict]:
    locations = gh.get_repo(f"secret-scanning/alerts/{alert_id}/locations", paged=True)
    LOG.debug("Retrieved %s location(s) for alert %s", len(locations), alert_id)
    return locations


if __name__ == "__main__":
    main()
