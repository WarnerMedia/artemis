import os

DOMAIN_NAME = os.environ.get("ARTEMIS_DOMAIN_NAME")
if DOMAIN_NAME is not None:
    API_PATH = f"https://{DOMAIN_NAME}/api/v1/"
else:
    API_PATH = ""
