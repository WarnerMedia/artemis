import aiohttp

from artemislib.logging import Logger
from license_retriever.util.license import retrieve_licenses_batch
from license_retriever.util.package import get_package_info


LOG = Logger(__name__)


async def retrieve_npm_licenses_batch(
    packages: list[tuple[str, str]], max_concurrent: int = 10
) -> dict[str, list[str]]:
    return await retrieve_licenses_batch(packages, get_package_license_async, max_concurrent)


async def get_package_license_async(session: aiohttp.ClientSession, name: str, version: str) -> list[str]:
    url = f"https://registry.npmjs.org/{name}/{version}"
    package_info = await get_package_info(session, url)
    if not package_info:
        return []
    return extract_licenses(package_info, name)


def extract_licenses(package_info: dict, package_name: str) -> list[str]:
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


def get_license(item: dict | str, package_name: str) -> str | None:
    if type(item) is str:
        return item.lower()
    elif type(item) is dict:
        if "type" in item and type(item["type"]) is str:
            return item["type"].lower()

    LOG.warning('Could not parse a license for "%s". It may be unconventional.', package_name)
    return None
