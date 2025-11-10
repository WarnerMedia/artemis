import re

import aiohttp
from license_retriever.util.license import retrieve_licenses_batch
from license_retriever.util.package import get_package_info
from artemislib.logging import Logger

LOG = Logger(__name__)


async def retrieve_go_licenses_batch(packages: list[tuple[str, str]], max_concurrent: int = 10) -> dict[str, list[str]]:
    return await retrieve_licenses_batch(packages, get_package_license_async, max_concurrent)


async def get_package_license_async(session: aiohttp.ClientSession, name: str, version: str) -> list[str]:
    url = f"https://pkg.go.dev/{name}?tab=licenses"
    package_info = await get_package_info(session, url, "text")
    if not package_info:
        return []
    return extract_licenses(package_info.get("response", ""))


def extract_licenses(html: str) -> list[str]:
    """Extract licenses from GO package HTML page"""
    licenses = []
    matches = re.findall(r'<div id="#lic-\d+">(.+)</div>', html)
    for match in matches:
        licenses += [item.strip().lower() for item in match.split(",")]
    return licenses
