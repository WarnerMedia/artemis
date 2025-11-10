import aiohttp
import asyncio

from artemislib.logging import Logger

LOG = Logger(__name__)


async def get_package_info(session: aiohttp.ClientSession, url: str, output: str = "json") -> dict | None:
    max_retries = 5
    retry_count = 0

    try:
        while retry_count < max_retries:
            async with session.get(url) as response:
                if response.status == 200:
                    if output == "text":
                        text = await response.text()
                        return {"response": text}
                    return await response.json()
                elif response.status == 404:
                    LOG.warning('Unable to find package info: "%s"', url)
                    return None
                elif response.status == 429:
                    # Rate limit handling
                    retry_after = int(response.headers.get("Retry-After", 5))
                    LOG.info("Rate limit reached, retrying after %s seconds", retry_after)
                    await asyncio.sleep(retry_after)
                    retry_count += 1
                    continue
                else:
                    LOG.error('Unexpected error": HTTP (%s) %s', response.status, url)
                    return None
    except Exception as e:
        LOG.error('Request failed for "%s": %s', url, str(e))
        return None

    LOG.error('Max retries exceeded for "%s" due to rate limiting', url)
    return None
