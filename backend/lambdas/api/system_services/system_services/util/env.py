import os

from artemislib.env import (
    APPLICATION,
    REV_PROXY_DOMAIN_SUBSTRING,
    REV_PROXY_SECRET,
    REV_PROXY_SECRET_HEADER,
    REV_PROXY_SECRET_REGION,
)

# Maximum time (connect+read) for each API call in auth status checks in seconds.
SERVICE_AUTH_CHECK_TIMEOUT = float(os.environ.get("SERVICE_AUTH_CHECK_TIMEOUT", 3))
