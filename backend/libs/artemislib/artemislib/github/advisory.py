import re

import requests
from botocore.exceptions import ClientError

from artemislib.aws import AWSConnect

GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql"


def get_advisory_ids(ghsa_id: str) -> list:
    """Queries the GitHub Advistory Database

    If the advisory has an associated CVE that is returned. If not, the GHSA ID is reflected back.
    """
    # Build the GraphQL query for a single security advisory
    query = {
        "query": """{
        securityAdvisory(ghsaId: "%s") {
            identifiers {
                type
                value
            }
        }
    }"""
        % ghsa_id
    }

    if not _is_valid_ghsa(ghsa_id):
        # Not formatted as a valid GHSA ID so return an empty list
        return []

    try:
        # This is a PAT with no scope that allows auth to the JQuery API
        ghsa_key = AWSConnect().get_secret("artemis/ghsa-key")["key"]
    except ClientError:
        # No API key so reflect back the GHSA ID
        return [ghsa_id]

    # Query the GitHub GraphQL API
    resp = requests.post(
        GITHUB_GRAPHQL_ENDPOINT,
        headers={"Authorization": f"bearer {ghsa_key}", "Content-Type": "application/json"},
        json=query,
    )

    # If we get an error reflect back the GHSA ID
    if resp.status_code != 200:
        return [ghsa_id]

    # Loop through the identifiers and gather up the CVEs
    advisory_ids = []
    for identifier in resp.json().get("data", {}).get("securityAdvisory", {}).get("identifiers", []):
        if identifier["type"] == "CVE" and _is_valid_cve(identifier["value"]):
            advisory_ids.append(identifier["value"])

    # If no CVEs reflect back the GHSA ID
    if not advisory_ids:
        advisory_ids = [ghsa_id]

    return advisory_ids


def _is_valid_ghsa(ghsa_id: str) -> bool:
    """Validates the provided string is formatted correctly for a GHSA ID"""
    return re.match("^GHSA(-[a-zA-Z0-9]+)+$", ghsa_id) is not None


def _is_valid_cve(cve_id: str) -> bool:
    """Valdates the provided string is formatted correctly for a CVE ID"""
    return re.match("^CVE-[0-9]{4}-[0-9]+$", cve_id) is not None
