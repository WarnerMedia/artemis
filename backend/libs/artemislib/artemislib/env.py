import os

APPLICATION = os.environ.get("APPLICATION", "artemis")
APPLICATION_TAG = os.environ.get("APPLICATION_TAG", APPLICATION)

# https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-envvars.html#envvars-list
#
# If AWS_DEFAULT_REGION is already set use that. If not default to us-east-2.
AWS_DEFAULT_REGION = os.environ.get("AWS_DEFAULT_REGION", "us-east-2")

# Reverse proxy configuration for when Artemis is using an authenticated reverse proxy to access
# private VCS instances.
#
# ARTEMIS_REVPROXY_DOMAIN_SUBSTRING -- Requests to VCS URLs containing this domain will include the auth header
# ARTEMIS_REVPROXY_SECRET -- Secrets Manager secret containing the auth key
# ARTEMIS_REVPROXY_SECRET_REGION -- AWS region for the Secrets Manager secret containing the auth key
# ARTEMIS_REVPROXY_AUTH_HEADER -- Authentication header to use
REV_PROXY_DOMAIN_SUBSTRING = os.environ.get("ARTEMIS_REVPROXY_DOMAIN_SUBSTRING")
REV_PROXY_SECRET = os.environ.get("ARTEMIS_REVPROXY_SECRET", f"{APPLICATION}/revproxy-api-key")
REV_PROXY_SECRET_REGION = os.environ.get("ARTEMIS_REVPROXY_SECRET_REGION", AWS_DEFAULT_REGION)
REV_PROXY_SECRET_HEADER = os.environ.get("ARTEMIS_REVPROXY_AUTH_HEADER", "X-Artemis-Proxy")

S3_BUCKET = os.environ.get("S3_BUCKET", None)
SQS_ENDPOINT = os.environ.get("SQS_ENDPOINT", None)
DEFAULT_S3_ENDPOINT = os.environ.get("ARTEMIS_DEFAULT_S3_ENDPOINT", "aws")
SCAN_DATA_S3_BUCKET = os.environ.get("ARTEMIS_SCAN_DATA_S3_BUCKET", S3_BUCKET)
SCAN_DATA_S3_ENDPOINT = os.environ.get("ARTEMIS_SCAN_DATA_S3_ENDPOINT", DEFAULT_S3_ENDPOINT)

DATADOG_ENABLED = os.environ.get("DATADOG_ENABLED", "False").capitalize() == "True"
