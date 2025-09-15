from os import environ
from asyncio import gather, run
from aiohttp import ClientSession

from artemislib.memcached import get_memcache_client
from artemislib.logging import Logger
from artemislib.metrics.factory import get_metrics
from artemislib.services import get_services_dict, ServiceType, VCSConfig, AuthType
from service_connection_metrics.aws import get_api_key
from service_connection_metrics.service_handlers import (
    ArtemisService,
    ServiceConnectionStatus,
    test_github,
    test_gitlab,
    test_ado,
    test_bitbucket_v1,
    test_bitbucket_v2,
)

logger = Logger(__name__)
metrics = get_metrics()

SERVICE_HANDLERS = {
    ServiceType.GITHUB: test_github,
    ServiceType.GITLAB: test_gitlab,
    ServiceType.BITBUCKET_V1: test_bitbucket_v1,
    ServiceType.BITBUCKET_V2: test_bitbucket_v2,
    ServiceType.ADO: test_ado,
}


def parse_service(services_dict: dict[str, VCSConfig], service_name: str) -> ArtemisService:
    name = service_name.lower()
    org = ""

    # Extract organization if present
    if "/*" in name:
        service_name = name = name.split("/*", 1)[0]
    elif "/" in name:
        name, org = name.split("/", 1)

    service = services_dict[name]

    # Update Bitbucket Service Type based on URL
    if service["type"] == ServiceType.BITBUCKET_V2.value:
        if "/1.0" in service["url"]:
            service["type"] = ServiceType.BITBUCKET_V1.value

    return ArtemisService(service_name=service_name, org=org, service=service)


def report_metrics(status: ServiceConnectionStatus):
    """
    Add metrics for each Service Connection Result
    """
    tags = {
        "service_name": status["service"],
        "auth_type": status["auth_type"],
        "service_type": status["service_type"],
    }
    if status["auth_successful"]:
        metrics.add_metric("successful_service_auth.count", 1, **tags)
    else:
        metrics.add_metric("failed_service_auth.count", 1, **tags)

    if status["reachable"]:
        metrics.add_metric("reachable_services.count", 1, **tags)
    else:
        metrics.add_metric("unreachable_services.count", 1, **tags)


async def check_service(session, svc: ArtemisService, key: str) -> ServiceConnectionStatus:
    # Negative Connection Result
    status: ServiceConnectionStatus = {
        "service": svc.service_name,
        "service_type": svc.service["type"],
        "reachable": False,
        "auth_successful": False,
        "auth_type": AuthType.SVC.value,
        "error": None,
    }
    handler = SERVICE_HANDLERS.get(ServiceType(svc.service["type"]))
    try:
        if handler:
            return await handler(session, key, svc, status)
        else:
            status["reachable"] = False
            status["auth_successful"] = False
            status["error"] = "Unsupported service type"
            return status
    except Exception as err:
        logger.exception(err)
        status["error"] = "An unexpected error occurred in Artemis"

    return status


async def main(artemis_services: list[ArtemisService]):
    async with ClientSession() as session:
        tasks = []
        for svc in artemis_services:
            key: str = get_api_key(svc.service["secret_loc"])
            tasks.append(check_service(session, svc, key))

        results = await gather(*tasks, return_exceptions=True)

        # Cache Results & Report Metrics
        client = get_memcache_client()
        for result in results:
            if isinstance(result, Exception):
                logger.exception(result)
            elif isinstance(result, dict):
                key = f"service_connection_status:{result["service"]}"
                client.set(key, result)
                report_metrics(result)
        await session.close()
        return results


@metrics.log_metrics
def handler(event, context):
    services = get_services_dict()
    artemis_services = [parse_service(services["services"], org) for org in services["scan_orgs"]]
    return run(main(artemis_services))


if __name__ == "__main__":
    handler("", "")
