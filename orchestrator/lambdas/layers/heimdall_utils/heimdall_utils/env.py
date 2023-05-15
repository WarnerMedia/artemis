import os

APPLICATION = os.environ.get("APPLICATION", "heimdall")
ARTEMIS_API = os.environ.get("ARTEMIS_API")
API_KEY_LOC = os.environ.get("ARTEMIS_API_KEY", f"{APPLICATION}/artemis-api-key")
DEFAULT_API_TIMEOUT = int(os.environ.get("DEFAULT_API_TIMEOUT", 30))
