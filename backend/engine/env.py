import json
import os
import re

from artemislib.aws import AWS_DEFAULT_REGION
from artemislib.logging import Logger

log = Logger(__name__)

APPLICATION = os.environ.get("APPLICATION", "artemis")

# This should be used in a dev/testing system to force use of the local services.json
LOCAL_SERVICES_OVERRIDE = bool(int(os.environ.get("ARTEMIS_LOCAL_SERVICES_OVERRIDE", "0")))

HOST_WORKING_DIR = os.environ.get("HOST_WORKING_DIR", "/tmp/work")
WORKING_DIR = "/work"
SSH_DIR = "/root/.ssh"
ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))
REGION = os.environ.get("REGION", "us-east-2")
ECR = os.environ.get("ECR", "")
SQS_ENDPOINT = os.environ.get("SQS_ENDPOINT", None)
INSTANCE_ID = os.environ.get("INSTANCE_ID", None)
S3_BUCKET = os.environ.get("S3_BUCKET", None)
S3_KEY = not LOCAL_SERVICES_OVERRIDE
SERVICES_S3_KEY = "services.json"
DEFAULT_DEPTH = os.environ.get("DEFAULT_DEPTH", None)
DEFAULT_INCLUDE_DEV = os.environ.get("DEFAULT_INCLUDE_DEV", False)
TASK_QUEUE = os.environ.get("TASK_QUEUE")
PRIORITY_TASK_QUEUE = os.environ.get("PRIORITY_TASK_QUEUE")

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

# Secrets Manager Key for Private Docker Repo Configs
ARTEMIS_PRIVATE_DOCKER_REPOS_KEY = os.environ.get("ARTEMIS_PRIVATE_DOCKER_REPOS_KEY")

# The engine ID is the HOSTNAME variable, which is the container ID
ENGINE_ID = os.environ.get("HOSTNAME", "")

# The size of the Java heap to set inside of plugins, if needed.
DEFAULT_PLUGIN_JAVA_HEAP_SIZE = "2g"
PLUGIN_JAVA_HEAP_SIZE = os.environ.get("ARTEMIS_PLUGIN_JAVA_HEAP_SIZE", DEFAULT_PLUGIN_JAVA_HEAP_SIZE)
if re.match(r"^\d{1,4}[mg]$", PLUGIN_JAVA_HEAP_SIZE) is None:
    log.error(
        "ARTEMIS_PLUGIN_JAVA_HEAP_SIZE value is invalid: '%s'. Using default: '%s'.",
        PLUGIN_JAVA_HEAP_SIZE,
        DEFAULT_PLUGIN_JAVA_HEAP_SIZE,
    )
    PLUGIN_JAVA_HEAP_SIZE = DEFAULT_PLUGIN_JAVA_HEAP_SIZE

STATUS_LAMBDA = os.environ.get("ARTEMIS_STATUS_LAMBDA")

MANDATORY_INCLUDE_PATHS = json.loads(os.environ.get("ARTEMIS_MANDATORY_INCLUDE_PATHS") or "[]")
PROCESS_SECRETS_WITH_PATH_EXCLUSIONS = (
    os.environ.get("ARTEMIS_PROCESS_SECRETS_WITH_PATH_EXCLUSIONS", "false").lower() == "true"
)
# ARTEMIS_METADATA_SCHEME_MODULES is a CSV list of metadata processing plugin modules
METADATA_SCHEME_MODULES = list(filter(None, os.environ.get("ARTEMIS_METADATA_SCHEME_MODULES", "").split(",")))

SECRETS_EVENTS_ENABLED = os.environ.get("ARTEMIS_SECRETS_EVENTS_ENABLED", "false").lower() == "true"
INVENTORY_EVENTS_ENABLED = os.environ.get("ARTEMIS_INVENTORY_EVENTS_ENABLED", "false").lower() == "true"
CONFIGURATION_EVENTS_ENABLED = os.environ.get("ARTEMIS_CONFIGURATION_EVENTS_ENABLED", "false").lower() == "true"

DB_RETRY_WAIT = int(os.environ.get("ARTEMIS_DB_RETRY_WAIT", 5))  # seconds
DB_RETRY_LIMIT = int(os.environ.get("ARTEMIS_DB_RETRY_LIMIT", 60))  # 60 retries @ 5 seconds each is 5 minutes
