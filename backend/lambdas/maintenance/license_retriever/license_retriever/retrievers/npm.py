from time import sleep
from typing import Optional, Union

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

from artemislib.logging import Logger

LOG = Logger(__name__)

# Create a session with retry logic once
session = requests.Session()
retry_strategy = Retry(total=3, backoff_factor=1, status_forcelist=[429, 500, 502, 503, 504], allowed_methods=["GET"])
adapter = HTTPAdapter(max_retries=retry_strategy)
session.mount("https://", adapter)


def retrieve_npm_licenses(name: str, version: str) -> list:
    package_info = get_package_info(name, version)
    if not package_info:
        return []

    return get_package_license(package_info, f"{name}@{version}")


def get_package_info(name: str, version: str) -> dict:
    url = f"https://registry.npmjs.org/{name}/{version}"

    try:
        r = session.get(url, timeout=30)

        if r.status_code == 200:
            return r.json()
        elif r.status_code == 404:
            LOG.warning('Unable to find package info for "%s@%s" on registry.npmjs.org', name, version)
            return {}
        else:
            LOG.error('Unexpected error for "%s@%s": HTTP %s', name, version, r.status_code)
            return {}

    except requests.exceptions.RequestException as e:
        LOG.error('Request failed for "%s@%s": %s', name, version, str(e))
        return {}


def get_package_license(package_info: dict, package_name: str) -> list[str]:
    # Official Spec: https://docs.npmjs.com/cli/v10/configuring-npm/package-json#license
    # We support the official spec, as well as the "deprecated" syntax with objects/arrays in a
    # `license` or `licenses` property
    #
    # So, we should be able to parse all of these:
    # license: "GPL-3.0"
    # license: "(GPL-3.0 OR MIT)" # SPDX expression. We will return the expression whole as a string
    # license: [
    #     "GPL-3.0",
    #     "MIT"
    # ]
    # license: {
    #     type: "GPL-3.0",
    #     url: "..."
    # }
    # licenses: [
    #     { type: "GPL-3.0", url: "..." },
    #     { type: "MIT", url: "..." }
    # ]

    if "license" in package_info:
        license = package_info["license"]
    elif "licenses" in package_info:
        license = package_info["licenses"]
    else:
        LOG.warning('No license information in package info for "%s"', package_name)
        return []

    if type(license) is list:
        result = []

        for item in license:
            item_license = get_license(item, package_name)

            if item_license:
                result.append(item_license)

        return result
    else:
        item_license = get_license(license, package_name)

        if item_license:
            return [item_license]
        else:
            return []


def get_license(item: Union[dict, str], package_name: str) -> Optional[str]:
    if type(item) is str:
        return item.lower()
    elif type(item) is dict:
        if "type" in item and type(item["type"]) is str:
            return item["type"].lower()

    LOG.warning('Could not parse a license for "%s". It may be unconventional.', package_name)
    return None
