import re
from time import sleep

import requests

from artemislib.logging import Logger

LOG = Logger(__name__)


def retrieve_go_licenses(name: str, _version: str) -> list:
    package_info = get_package_info(name)
    if not package_info:
        return []

    return extract_licenses(package_info)


def get_package_info(name: str) -> str:
    url = f"https://pkg.go.dev/{name}?tab=licenses"

    while True:
        r = requests.get(url)
        if r.status_code == 200:
            return r.text
        elif r.status_code == 429:
            retry = int(r.headers.get("Retry-After", 5))
            LOG.info("Rate limit reached, retrying after %s seconds", retry)
            sleep(retry)
        else:
            LOG.error("Unable to find package info for %s: HTTP %s", name, r.status_code)
            return ""


def extract_licenses(html: str) -> list:
    licenses = []
    matches = re.findall(r'<div id="#lic-\d+">(.+)</div>', html)
    for match in matches:
        licenses += [item.strip().lower() for item in match.split(",")]
    return licenses
