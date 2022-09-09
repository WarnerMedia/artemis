import os

DOMAIN_NAME = os.environ.get("ARTEMIS_DOMAIN_NAME")
if DOMAIN_NAME is not None:
    API_PATH = f"https://{DOMAIN_NAME}/api/v1/"
else:
    API_PATH = ""

# ARTEMIS_METADATA_FORMATTER_MODULE is a module that contains a custom metadata
# formatting method with the signature: formatter(dict) -> dict
METADATA_FORMATTER_MODULE = os.environ.get("ARTEMIS_METADATA_FORMATTER_MODULE")
