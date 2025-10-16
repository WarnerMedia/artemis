import asyncio
import re

import aiohttp
from artemislib.logging import Logger

LOG = Logger(__name__)


async def retrieve_go_licenses_batch(packages: list[tuple[str, str]], max_concurrent: int = 10) -> dict[str, list[str]]:
    """
    Retrieve licenses for multiple GO packages concurrently using asyncio.
    
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
    package_info = await get_package_info(session, name)
    if not package_info:
        return []
    
    return extract_licenses(package_info)


async def get_package_info(session: aiohttp.ClientSession, name: str) -> str:
    """Async version of package info retrieval using aiohttp with rate limiting"""
    url = f"https://pkg.go.dev/{name}?tab=licenses"

    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.text()
                elif response.status == 404:
                    LOG.warning('Unable to find package info for "%s" on pkg.go.dev', name)
                    return ""
                elif response.status == 429:
                    # Rate limit handling
                    retry_after = int(response.headers.get("Retry-After", 5))
                    LOG.info('Rate limit reached for "%s", retrying after %s seconds', name, retry_after)
                    await asyncio.sleep(retry_after)
                    retry_count += 1
                    continue
                else:
                    LOG.error('Unexpected error for "%s": HTTP %s', name, response.status)
                    return ""

        except Exception as e:
            LOG.error('Request failed for "%s": %s', name, str(e))
            return ""
    
    LOG.error('Max retries exceeded for "%s" due to rate limiting', name)
    return ""


def extract_licenses(html: str) -> list[str]:
    """Extract licenses from GO package HTML page"""
    licenses = []
    matches = re.findall(r'<div id="#lic-\d+">(.+)</div>', html)
    for match in matches:
        licenses += [item.strip().lower() for item in match.split(",")]
    return licenses
