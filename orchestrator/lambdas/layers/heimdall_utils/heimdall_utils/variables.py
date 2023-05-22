import os

REGION = os.environ.get("REGION", "us-east-2")
ARTEMIS_S3_BUCKET = os.getenv("ARTEMIS_S3_BUCKET")
ROOT_DIR = os.path.dirname(os.path.abspath(os.path.join(__file__, "..", "..", "..", "..", "..", "..")))

# Reverse proxy configuration for when Artemis is using an authenticated reverse proxy to access
# private VCS instances.
#
# ARTEMIS_REVPROXY_DOMAIN_SUBSTRING -- Requests to VCS URLs containing this domain will include the auth header
# ARTEMIS_REVPROXY_SECRET -- Secrets Manager secret containing the auth key
# ARTEMIS_REVPROXY_SECRET_REGION -- AWS region for the Secrets Manager secret containing the auth key
# ARTEMIS_REVPROXY_AUTH_HEADER -- Authentication header to use
REV_PROXY_DOMAIN_SUBSTRING = os.environ.get("ARTEMIS_REVPROXY_DOMAIN_SUBSTRING")
REV_PROXY_SECRET = os.environ.get("ARTEMIS_REVPROXY_SECRET", "artemis/revproxy-api-key")
REV_PROXY_SECRET_REGION = os.environ.get("ARTEMIS_REVPROXY_SECRET_REGION", REGION)
REV_PROXY_SECRET_HEADER = os.environ.get("ARTEMIS_REVPROXY_AUTH_HEADER", "X-Artemis-Proxy")
