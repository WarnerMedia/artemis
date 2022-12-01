import os

from artemislib.aws import AWS_DEFAULT_REGION

APPLICATION = os.environ.get("APPLICATION", "artemis")

DEFAULT_DEPTH = int(os.environ.get("DEFAULT_DEPTH", 500))
DEFAULT_INCLUDE_DEV = os.environ.get("DEFAULT_INCLUDE_DEV", "False") == "True"
DEFAULT_BATCH_PRIORITY = os.environ.get("DEFAULT_BATCH_PRIORITY", "False") == "True"
S3_BUCKET = os.environ.get("S3_BUCKET", None)
SQS_ENDPOINT = os.environ.get("SQS_ENDPOINT", None)
TASK_QUEUE_NAT = os.environ.get("TASK_QUEUE_NAT", None)
TASK_QUEUE = os.environ.get("TASK_QUEUE", None)
PRIORITY_TASK_QUEUE = os.environ.get("PRIORITY_TASK_QUEUE", None)
PRIORITY_TASK_QUEUE_NAT = os.environ.get("PRIORITY_TASK_QUEUE_NAT", None)
JSON_REPORT_LAMBDA = os.environ.get("JSON_REPORT_LAMBDA", None)
SBOM_REPORT_LAMBDA = os.environ.get("SBOM_REPORT_LAMBDA", None)
REPORT_QUEUE = os.environ.get("REPORT_QUEUE", None)
AQUA_ENABLED = bool(int(os.environ.get("ARTEMIS_FEATURE_AQUA_ENABLED", "1")))
VERACODE_ENABLED = bool(int(os.environ.get("ARTEMIS_FEATURE_VERACODE_ENABLED", "1")))
SNYK_ENABLED = bool(int(os.environ.get("ARTEMIS_FEATURE_SNYK_ENABLED", "1")))

# This should be used in a dev/testing system to force use of the local services.json
LOCAL_SERVICES_OVERRIDE = bool(int(os.environ.get("ARTEMIS_LOCAL_SERVICES_OVERRIDE", "0")))

DEFAULT_ORG = os.environ.get("ARTEMIS_DEFAULT_ORG", "defaultorg")

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
