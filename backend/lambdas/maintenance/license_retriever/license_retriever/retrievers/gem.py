import aiohttp
from urllib3.util import parse_url

from artemislib.logging import Logger
from license_retriever.util.license import retrieve_licenses_batch
from license_retriever.util.package import get_package_info
from license_retriever.util.github import get_license

LOG = Logger(__name__)


async def retrieve_gem_licenses_batch(
    packages: list[tuple[str, str]], max_concurrent: int = 10
) -> dict[str, list[str]]:
    return await retrieve_licenses_batch(packages, get_package_license_async, max_concurrent)


async def get_package_license_async(session: aiohttp.ClientSession, name: str, version: str) -> list[str]:
    url = f"https://rubygems.org/api/v2/rubygems/{name}/versions/{version}.json"
    package_info = await get_package_info(session, url)
    if not package_info:
        return []
    return await extract_licenses(package_info)


async def extract_licenses(package_info: dict) -> list[str]:
    """Process GEM package info to extract licenses (async version)"""
    if not package_info or not package_info.get("licenses"):
        # Try GitHub fallback if no licenses found
        if parse_url(package_info.get("homepage_uri", "")).hostname == "github.com":
            repo_license = await get_license(package_info["homepage_uri"])
            if repo_license:
                return [repo_license]
        return []

    licenses = [license.lower() for license in package_info["licenses"]]

    # If no licenses found but has GitHub homepage, try to get license from repo
    if not licenses and parse_url(package_info.get("homepage_uri", "")).hostname == "github.com":
        repo_license = await get_license(package_info["homepage_uri"])
        if repo_license:
            licenses.append(repo_license)

    return licenses
