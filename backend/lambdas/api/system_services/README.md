# Service Management

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

## Local Testing

Before running API runner locally, you will need to create a user in your local db and assign them access to services.

* To create a user, you can get a shell environment in the engine container.
* Then run `python` to get an interactive shell.
* Add required packages using `from artemisdb.artemisdb.models import Group, User`
* Then you can add a user `user = User.objects.create(email='testuser@example.com', scope='["*"]')`
* Warning: this will assign the user to all scopes.
* Then you need to add the user to a group. `Group.create_self_group(user)`

Using API Runner, you can then test the API with the following command `api_runner --api system_services --method GET --path-params '{"system_service_id":"YOUR_SERVICE/YOUR_ORG"}'`
