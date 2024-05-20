# Service status

API endpoints for retrieving the status (reachability, authentication, etc.) of system services.

## Endpoints

* `/system/services`
* `/system/services/{id}`
* `/system/services/{id}/stats`

## Configuration

### Standard environment variables

* `APPLICATION`
* `REV_PROXY_DOMAIN_SUBSTRING`
* `REV_PROXY_SECRET`
* `REV_PROXY_SECRET_HEADER`
* `REV_PROXY_SECRET_REGION`

### Lambda-specific environment variables

* `SERVICE_AUTH_CHECK_TIMEOUT` - (Optional) Maximum time (connect+read) for each API call in auth status checks, in seconds (may be a floating-point value, e.g. `0.5`). Default: `3`.
