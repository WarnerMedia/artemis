from time import sleep
from typing import Optional, Union

import requests

from artemislib.logging import Logger

LOG = Logger(__name__)


def retrieve_npm_licenses(name: str, version: str) -> list:
    package_info = get_package_info(name, version)
    if not package_info:
        return []

    return get_package_license(package_info, f"{name}@{version}")


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
        LOG.debug('No license information in package info for "%s"', package_name)
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
