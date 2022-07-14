import re
from datetime import datetime, timedelta, timezone

import requests
from simplejson.errors import JSONDecodeError

from artemislib.db_cache import DBLookupCache
from artemislib.github.advisory import get_advisory_ids

CVE_REGEX = re.compile("CVE-[0-9]{4}-[0-9]+")

NPM_ADVISORY_URL_PREFIX = "https://npmjs.com/advisories/"
GITHUB_ADVISORY_URL_PREFIX = "https://github.com/advisories/"


def find_cves(advisory_url) -> list:
    cache = DBLookupCache()

    # Lookup the advisory URL in the cache
    cve = cache.lookup(key=advisory_url)

    # If it was found return the CVEs
    if cve:
        return cve.split(",")

    cves = []
    if advisory_url.startswith(NPM_ADVISORY_URL_PREFIX):
        cves = _process_npmjs_advisory(advisory_url)
    elif advisory_url.startswith(GITHUB_ADVISORY_URL_PREFIX):
        cves = _process_github_advisory(advisory_url)

    if not cves:
        # If no CVEs were found use the advisory URL
        cves = [advisory_url]

    # Store the CVEs (or advisory URL) in the DB cache to avoid having to pull the advisory again
    expires = datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(days=7)  # Cache for 1 week
    cache.store(advisory_url, ",".join(cves), expires)

    return cves


def _process_npmjs_advisory(advisory_url: str) -> list:
    # CVE was not found in the cache so try to get it from the npmjs advisory itself
    #
    # There is not a good way to get CVEs for NPM advisories anymore. The workaround at the moment is to pull the
    # advisory with `x-spifreack: 1` in the request headers and parsing the JSON response. There are more details
    # at https://github.com/npm/cli/issues/598 and hopefully this issue will be resolved with CVEs being added back
    # to the advisories returned by `npm audit`
    resp = requests.get(advisory_url, headers={"x-spiferack": "1"})

    cves = []
    if "Location" in resp.headers:
        # If the advisory URL is redirecting to the GitHub Advistory Database query the GitHub API for the CVE IDs
        if resp.headers["Location"].startswith(f"{GITHUB_ADVISORY_URL_PREFIX}GHSA-"):
            ghsa_id = resp.headers["Location"].replace(GITHUB_ADVISORY_URL_PREFIX, "")
            cves = get_advisory_ids(ghsa_id)
    elif resp.status_code == 200:
        try:
            adv = resp.json()
            if adv.get("advisoryData", {}).get("cves", []):
                # If the "cves" list in the advisory is populated use it
                cves = adv["advisoryData"]["cves"]
            else:
                # Otherwise attempt to extract CVE IDs from the references
                cves = CVE_REGEX.findall(adv.get("advisoryData", {}).get("references", ""))
        except JSONDecodeError:
            # Unable to parse the response so return the advisory URL as the ID
            cves = [advisory_url]

    return cves


def _process_github_advisory(advisory_url: str) -> list:
    ghsa_id = advisory_url.replace(GITHUB_ADVISORY_URL_PREFIX, "")
    return get_advisory_ids(ghsa_id)
