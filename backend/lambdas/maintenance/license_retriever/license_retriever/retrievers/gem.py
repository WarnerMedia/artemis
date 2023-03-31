from time import sleep

import requests

from artemislib.logging import Logger
from license_retriever.util.github import get_license

LOG = Logger(__name__)


def retrieve_gem_licenses(name: str, version: str) -> list:
    package_info = get_package_info(name, version)
    if not package_info:
        return []

    licenses = [license.lower() for license in package_info.get("licenses", [])]
    if not licenses and package_info.get("homepage_uri", "").startswith("https://github.com"):
        repo_license = get_license(package_info["homepage_uri"])
        if repo_license:
            licenses.append(repo_license)
    return licenses


def get_package_info(name: str, version: str) -> dict:
    url = f"https://rubygems.org/api/v2/rubygems/{name}/versions/{version}.json"

    while True:
        r = requests.get(url)
        if r.status_code == 200:
            return r.json()
        elif r.status_code == 429:
            retry = int(r.headers.get("Retry-After", 5))
            LOG.info("Rate limit reached, retrying after %s seconds", retry)
            sleep(retry)
        else:
            LOG.error("Unable to find package info for %s %s: HTTP %s", name, version, r.status_code)
            return {}
