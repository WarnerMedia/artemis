# pylint: disable=no-member
from copy import deepcopy
from http import HTTPStatus

import requests
from aws_lambda_powertools import Logger

from heimdall_utils.env import APPLICATION, ARTEMIS_API, DEFAULT_API_TIMEOUT

LOG = Logger(service=APPLICATION, name=__name__, child=True)


def redundant_scan_exists(
    api_key: str,
    service: str,
    org: str,
    repo: str,
    branch: str,
    timestamp: str,
    query: dict,
    raise_for_status: bool = False,  # Useful during testing
) -> bool:
    """
    Determine if an Artemis scan for the service/org/repo+branch matching
    the provided query has been created since the provided timestamp
    """
    if not query:
        # No query provided bypasses the check altogether
        return False

    LOG.debug("Checking for scan of %s/%s/%s:%s since %s", service, org, repo, branch, timestamp)

    # Build the Artemis scan search parameters
    params = deepcopy(query)  # Start with the provided query
    params["limit"] = 1  # We only need to pull back a single scan to determine if any exist
    params["service"] = service.lower()  # Add the service to the query
    params["repo"] = f"{org}/{repo}".lower()  # Add the org/repo to the query
    if branch is None:
        params["branch__isnull"] = True  # Add null branch to the query
    else:
        params["branch"] = branch  # Add the branch to the query
    params["created__gt"] = timestamp  # Add the timestamp to the query

    r = requests.get(
        f"{ARTEMIS_API}/search/scans",
        headers={"x-api-key": api_key, "Content-Type": "application/json"},
        params=params,
        timeout=DEFAULT_API_TIMEOUT,
    )
    if raise_for_status:
        r.raise_for_status()
    if r.status_code == HTTPStatus.OK:
        # Return a boolean matching whether any scans were returned
        if r.json().get("count", 0) > 0:
            LOG.debug("Scan of %s/%s/%s:%s exists", service, org, repo, branch)
            return True
        else:
            LOG.debug("Scan of %s/%s/%s:%s does not exist", service, org, repo, branch)
            return False

    # Something else happened so default to assuming a redundant scan doesn't exist
    return False
