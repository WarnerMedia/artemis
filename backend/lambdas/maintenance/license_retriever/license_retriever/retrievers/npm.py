from time import sleep
from typing import Optional, Union

import json
import requests

from artemislib.logging import Logger

LOG = Logger(__name__)


def retrieve_npm_licenses(name: str, version: str) -> list:
    package_info = get_package_info(name, version)
    if not package_info:
        return []

    license = package_info.get("license", [])  # license could be a list / string
    result = []

    if type(license) is str:
        return [license.lower()]

    for item in license:
        item_type = type(item)
        if item_type is str:
            result.append(item.lower())
        elif item_type is dict and 'type' in item:
            result.append(item['type'].lower())
        else:
            LOG.error(f'Unexpected license format for npm package, "{name}@{version}". Result was: {json.dumps(item)}')

    return result


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
