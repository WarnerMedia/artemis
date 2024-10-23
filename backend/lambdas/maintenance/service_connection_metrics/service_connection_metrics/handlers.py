from os import environ
from asyncio import gather, run
from aiohttp import ClientSession
from typing import TypedDict, Optional

from artemislib.aws import AWSConnect
from artemislib.logging import Logger
from artemislib.metrics.factory import get_metrics

ARTEMIS_API_BASE_URL = environ.get("ARTEMIS_API_BASE_URL")
ARTEMIS_API_KEY = environ.get("ARTEMIS_API_SECRET_ARN")


logger = Logger(__name__)
metrics = get_metrics()


class ConnectionResult(TypedDict):
    service: str
    service_type: str
    reachable: bool
    auth_successful: bool
    auth_type: str
    error: str


class ArtemisApiResponse(TypedDict):
    """
    API response from the /system/services endpoint
    """

    count: int
    previous: Optional[str]
    next: Optional[str]
    results: list[ConnectionResult]


@metrics.log_metrics
def handler(event, context):
    if not ARTEMIS_API_BASE_URL:
        logger.error("Artemis API endpoint not configured")
        return

    api_key = get_api_key()
    if not api_key:
        logger.error("Missing API token")
        return

    run(main(api_key))


async def main(artemis_api_key: str):
    async with ClientSession() as session:
        # Get current count of service connections
        query = f"{ARTEMIS_API_BASE_URL}/system/services?limit=1"
        headers = get_headers(artemis_api_key)
        session = ClientSession(headers=headers)
        result = await query_artemis_api(session, query)

        # Build services endpoint queries
        service_count = result["count"]
        urls = build_queries(service_count)

        # Run all coroutines
        tasks = [query_artemis_api(session, url) for url in urls]
        service_connection_results = await gather(*tasks)

        for result in service_connection_results:
            report_metrics(result)

        await session.close()


def build_queries(service_count: int):
    urls = []
    for offset in range(0, service_count, 20):
        query = f"{ARTEMIS_API_BASE_URL}/system/services?limit=20&offset={offset}"
        urls.append(query)

    return urls


def get_api_key() -> str:
    aws = AWSConnect()
    return aws.get_secret(ARTEMIS_API_KEY).get("key")


def get_headers(artemis_api_key: str) -> dict:
    return {
        "x-api-key": f"{artemis_api_key}",
        "Content-Type": "application/json",
    }


def report_metrics(response: ArtemisApiResponse):
    """
    Add metrics for each Service Connection Result
    """
    for service in response["results"]:
        tags = {
            "service_name": service["service"],
            "auth_type": service["auth_type"],
            "service_type": service["service_type"],
        }
        if service["auth_successful"]:
            metrics.add_metric("successful_service_auth.count", 1, **tags)
        else:
            metrics.add_metric("failed_service_auth.count", 1, **tags)

        if service["reachable"]:
            metrics.add_metric("reachable_services.count", 1, **tags)
        else:
            metrics.add_metric("unreachable_services.count", 1, **tags)


# Define an asynchronous function to fetch a URL
async def query_artemis_api(session: ClientSession, url: str):
    async with session.get(url) as response:
        return await response.json()
