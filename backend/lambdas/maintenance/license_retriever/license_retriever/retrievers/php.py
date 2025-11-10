import aiohttp
from urllib3.util import parse_url
from artemislib.logging import Logger
from license_retriever.util.github import get_license

from license_retriever.util.license import retrieve_licenses_batch
from license_retriever.util.package import get_package_info

LOG = Logger(__name__)


async def retrieve_php_licenses_batch(
    packages: list[tuple[str, str]], max_concurrent: int = 10
) -> dict[str, list[str]]:
    return await retrieve_licenses_batch(packages, get_package_license_async, max_concurrent)


async def get_package_license_async(session: aiohttp.ClientSession, name: str, version: str) -> list[str]:
    url = f"https://repo.packagist.org/p2/{name}.json"
    package_info = await get_package_info(session, url)
    if not package_info:
        return []
    return await extract_licenses(package_info, name)


async def extract_licenses(package_info: dict, name: str) -> list[str]:
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
