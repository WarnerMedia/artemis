import asyncio
from typing import Optional, Union

import aiohttp

from artemislib.logging import Logger

LOG = Logger(__name__)


async def retrieve_npm_licenses_batch(packages: list[tuple[str, str]], max_concurrent: int = 10) -> dict[str, list[str]]:
    """
    Retrieve licenses for multiple packages concurrently using asyncio.
    
    Args:
        packages: List of (name, version) tuples
        max_concurrent: Maximum number of concurrent requests
    
    Returns:
        Dict mapping "name@version" to list of licenses
    """
    connector = aiohttp.TCPConnector(limit=max_concurrent)
    timeout = aiohttp.ClientTimeout(total=30)
    
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [
            get_package_license_async(session, name, version)
            for name, version in packages
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Format results as dict
        license_data = {}
        for i, (name, version) in enumerate(packages):
            key = f"{name}@{version}"
            if isinstance(results[i], Exception):
                LOG.error('Failed to get license for "%s": %s', key, results[i])
                license_data[key] = []
            else:
                license_data[key] = results[i]
        
        return license_data


async def get_package_license_async(session: aiohttp.ClientSession, name: str, version: str) -> list[str]:
    """Async version of license retrieval for a single package"""
    package_info = await get_package_info(session, name, version)
    if not package_info:
        return []
    
    return get_package_license(package_info, f"{name}@{version}")


async def get_package_info(session: aiohttp.ClientSession, name: str, version: str) -> dict:
    """Async version of package info retrieval using aiohttp"""
    url = f"https://registry.npmjs.org/{name}/{version}"

    try:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 404:
                LOG.warning('Unable to find package info for "%s@%s" on registry.npmjs.org', name, version)
                return {}
            else:
                LOG.error('Unexpected error for "%s@%s": HTTP %s', name, version, response.status)
                return {}

    except Exception as e:
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
