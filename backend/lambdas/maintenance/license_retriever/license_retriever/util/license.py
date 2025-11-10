import asyncio
from typing import Callable
import aiohttp

from artemislib.logging import Logger

LOG = Logger(__name__)


async def retrieve_licenses_batch(
    packages: list[tuple[str, str]],
    get_license: Callable,
    max_concurrent: int = 10,
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
        tasks = [get_license(session, name, version) for name, version in packages]

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
