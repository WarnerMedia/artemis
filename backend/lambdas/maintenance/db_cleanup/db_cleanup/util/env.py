import os

DAY = 1440  # 1 day in minutes

# Max age for a terminated engine record. Default to 30 days, which matches engine log retention.
MAX_ENGINE_AGE = int(os.environ.get("MAX_ENGINE_AGE", 30 * DAY))

# Max age for a Heimdall secret scan
# Defaulting to 90 days
MAX_SECRET_SCAN_AGE = int(os.environ.get("MAX_SECRET_SCAN_AGE", 90 * DAY))

# Max age for any scan
# Defaulting to 180 days
MAX_SCAN_AGE = int(os.environ.get("MAX_SCAN_AGE", 180 * DAY))
