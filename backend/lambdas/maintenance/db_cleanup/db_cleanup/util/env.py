import os

DAY = 1440  # 1 day in minutes

# Max age for a terminated engine record. Default to 30 days, which matches engine log retention.
MAX_ENGINE_AGE = int(os.environ.get("MAX_ENGINE_AGE", 30 * DAY))

# Max age for a Heimdall secret scan
#
# According to the data retention requirements, if the findings from scans are passed to a downstream
# system, such as Brinqa or Splunk, and that other downstream system is the “official” system of record,
# then the data that is retained in Artemis is considered ROT (Redundant, Obsolete, Trivial). In this
# scenario, it is a “non-record” and in the absence of being directed to preserve documentation (e.g.
# existing litigation, investigation, or audit), non-records should be discarded when they no longer
# serve a business purpose.
#
# Defaulting to 90 days since secrets findings flow from Artemis into Splunk (and on to Brinqa)
MAX_SECRET_SCAN_AGE = int(os.environ.get("MAX_SECRET_SCAN_AGE", 90 * DAY))

# Max age for any scan
#
# According to the data retention requirements, if the findings from scans, even if it is a portion of
# the data set, does not pass to a downstream system, then Artemis is considered the “official” system
# of record for that slice of the data set and the “Record Series Description” indicates it is part of
# the INF-132 (“Information Security Audit Logs Security”) record series which has a global retention
# of 180 days.
#
# Defaulting to 180 days since vulnerability findings do not flow into Brinqa yet
MAX_SCAN_AGE = int(os.environ.get("MAX_SCAN_AGE", 180 * DAY))
