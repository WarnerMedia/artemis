import asyncio

import aiohttp
from artemislib.logging import Logger
from license_retriever.util.github import get_license
from urllib3.util import parse_url

LOG = Logger(__name__)


async def retrieve_php_licenses_batch(
    packages: list[tuple[str, str]], max_concurrent: int = 10
) -> dict[str, list[str]]:
    """
    Retrieve licenses for multiple PHP packages concurrently using asyncio.

    Args:
        packages: List of (name, version) tuples
        max_concurrent: Maximum number of concurrent requests

    Returns:
        Dict mapping "name@version" to list of licenses
    """
    connector = aiohttp.TCPConnector(limit=max_concurrent)
    timeout = aiohttp.ClientTimeout(total=30)

    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        tasks = [get_package_license_async(session, name, version) for name, version in packages]

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
    package_info = await get_package_info(session, name)
    if not package_info:
        return []

    return await process_php_licenses(session, package_info, name)


async def get_package_info(session: aiohttp.ClientSession, name: str) -> dict:
    """Async version of package info retrieval using aiohttp"""
    url = f"https://repo.packagist.org/p2/{name}.json"

    try:
        async with session.get(url) as response:
            if response.status == 200:
                return await response.json()
            elif response.status == 404:
                LOG.warning('Unable to find package info for "%s" on packagist.org', name)
                return {}
            else:
                LOG.error('Unexpected error for "%s": HTTP %s', name, response.status)
                return {}

    except Exception as e:
        LOG.error('Request failed for "%s": %s', name, str(e))
        return {}


async def process_php_licenses(session: aiohttp.ClientSession, package_info: dict, name: str) -> list[str]:
    """Process PHP package info to extract licenses (async version)"""
    if not package_info or "packages" not in package_info or name not in package_info["packages"]:
        return []

    package_data = package_info["packages"][name]
    if not package_data:
        return []

    # Get the first (usually latest) version data
    version_data = package_data[0]

    # Extract licenses
    licenses = []
    if "license" in version_data and version_data["license"]:
        licenses = [license.lower() for license in version_data["license"]]

    # If no licenses found but has GitHub homepage, try to get license from repo
    if not licenses and parse_url(package_info.get("homepage_uri", "")).hostname == "github.com":
        repo_license = await get_license(version_data["homepage"])
        if repo_license:
            licenses.append(repo_license)

    return licenses
