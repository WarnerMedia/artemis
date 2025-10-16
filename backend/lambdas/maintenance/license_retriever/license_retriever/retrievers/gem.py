import asyncio

import aiohttp
from artemislib.logging import Logger
from license_retriever.util.github import get_license

LOG = Logger(__name__)


async def retrieve_gem_licenses_batch(packages: list[tuple[str, str]], max_concurrent: int = 10) -> dict[str, list[str]]:
    """
    Retrieve licenses for multiple GEM packages concurrently using asyncio.
    
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
    
    return await process_gem_licenses(session, package_info, f"{name}@{version}")


async def get_package_info(session: aiohttp.ClientSession, name: str, version: str) -> dict:
    """Async version of package info retrieval using aiohttp with rate limiting"""
    url = f"https://rubygems.org/api/v2/rubygems/{name}/versions/{version}.json"

    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            async with session.get(url) as response:
                if response.status == 200:
                    return await response.json()
                elif response.status == 404:
                    LOG.warning('Unable to find package info for "%s@%s" on rubygems.org', name, version)
                    return {}
                elif response.status == 429:
                    # Rate limit handling
                    retry_after = int(response.headers.get("Retry-After", 5))
                    LOG.info('Rate limit reached for "%s@%s", retrying after %s seconds', name, version, retry_after)
                    await asyncio.sleep(retry_after)
                    retry_count += 1
                    continue
                else:
                    LOG.error('Unexpected error for "%s@%s": HTTP %s', name, version, response.status)
                    return {}

        except Exception as e:
            LOG.error('Request failed for "%s@%s": %s', name, version, str(e))
            return {}
    
    LOG.error('Max retries exceeded for "%s@%s" due to rate limiting', name, version)
    return {}


async def process_gem_licenses(session: aiohttp.ClientSession, package_info: dict, package_name: str) -> list[str]:
    """Process GEM package info to extract licenses (async version)"""
    if not package_info or not package_info.get("licenses"):
        # Try GitHub fallback if no licenses found
        if package_info.get("homepage_uri", "").startswith("https://github.com"):
            # Note: get_license is synchronous, but we'll keep this for now to maintain compatibility
            # In a future version, this could be made async as well
            repo_license = get_license(package_info["homepage_uri"])
            if repo_license:
                return [repo_license]
        return []

    licenses = [license.lower() for license in package_info["licenses"]]
    
    # If no licenses found but has GitHub homepage, try to get license from repo
    if not licenses and package_info.get("homepage_uri", "").startswith("https://github.com"):
        repo_license = get_license(package_info["homepage_uri"])
        if repo_license:
            licenses.append(repo_license)
    
    return licenses
