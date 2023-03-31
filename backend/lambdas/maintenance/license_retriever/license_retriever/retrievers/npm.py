from time import sleep

import requests

from artemislib.logging import Logger

LOG = Logger(__name__)


def retrieve_npm_licenses(name: str, version: str) -> list:
    package_info = get_package_info(name, version)
    if not package_info:
        return []

    if package_info.get("license"):
        return [package_info["license"].lower()]
    return []


def get_package_info(name: str, version: str) -> dict:
    url = f"https://registry.npmjs.org/{name}/{version}"

    while True:
        r = requests.get(url)
        if r.status_code == 200:
            return r.json()
        elif r.status_code == 429:
            retry = int(r.headers.get("Retry-After", 5))
            LOG.info("Rate limit reached, retrying after %s seconds", retry)
            sleep(retry)
        else:
            LOG.error("Unable to find package info for %s: HTTP %s", name, r.status_code)
            return {}
