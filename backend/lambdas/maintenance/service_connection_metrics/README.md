# Service Connection metrics

This Lambda runs on a schedule and reports connection metrics for each `version control services` that is integrated into Artemis. It queries the [`/system/services`](../../api/system_services/) endpoint and verifies the connections for all version control services.

## Configuration

### Standard environment variables

-   `APPLICATION`

### Lambda-specific environment variables

-   `ARTEMIS_API_SECRET_ARN` - (Required) ARN for the secret to store the
-   `ARTEMIS_API_BASE_URL` - Base URL for the artemis api
