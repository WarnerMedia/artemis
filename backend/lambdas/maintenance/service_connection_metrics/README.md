# Service Connection metrics

This Lambda runs on a schedule and reports connection metrics for each version control service (VCS) integrated into Artemis. It runs a connection/authentication check for each VCS and caches the results. The cached results are used by the `/system/services` endpoint for faster status reporting.

## Configuration

### Standard environment variables

-   `APPLICATION`

### Lambda-specific Environment Variables

-   `ARTEMIS_API_SECRET_ARN` — ARN for the secret to store the Artemis API key.
-   `ARTEMIS_API_BASE_URL` — Base URL for the Artemis API.
-   `ARTEMIS_MEMCACHED_ENDPOINT` — Hostname for the Memcached cluster.
-   `MEMCACHED_PORT` — Port for Memcached (default: 11211).
-   `REV_PROXY_SECRET_HEADER` — Header name for reverse proxy authentication.
-   `REV_PROXY_DOMAIN_SUBSTRING` — Substring to identify reverse proxy domains.

## Adding a New VCS Handler

1. Implement an async handler in `service_handlers.py` with the signature:
    ```python
    async def test_<vcs>(
        session: ClientSession,
        key: str,
        artemis_vcs: ArtemisService,
        status: ServiceConnectionStatus,
    ) -> ServiceConnectionStatus
    ```
2. Register the handler in the `SERVICE_HANDLERS` mapping in `handlers.py`.
