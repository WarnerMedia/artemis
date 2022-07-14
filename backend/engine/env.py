import os
import re

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
# ARTEMIS_REVPROXY_AUTH_HEADER -- Authentication header to use
REV_PROXY_DOMAIN_SUBSTRING = os.environ.get("ARTEMIS_REVPROXY_DOMAIN_SUBSTRING")
REV_PROXY_SECRET = os.environ.get("ARTEMIS_REVPROXY_SECRET", f"{APPLICATION}/revproxy-api-key")
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
