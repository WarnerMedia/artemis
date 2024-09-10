import os
from artemislib.aws import AWS_DEFAULT_REGION

# These environment variables are almost exclusively used locally.
# Environments variables are difficult to work with in plugins.
# See get_plugin_command() in backend/engine/utils/plugin.py

APPLICATION = os.environ.get("APPLICATION", "artemis")

RH_CONFIG_FILE_VAR = "RH_CONFIG_FILE"
RH_GITLAB_CONFIG_VAR = "RH_GITLAB_CONFIG"


def get_config_file():
    return os.environ.get(RH_CONFIG_FILE_VAR)


def has_config_file():
    return get_config_file() is not None


def get_gitlab_config():
    return os.environ.get(RH_GITLAB_CONFIG_VAR)


def has_gitlab_config():
    return get_gitlab_config() is not None


def get_rev_proxy_domain_substring():
    return os.environ.get("ARTEMIS_REVPROXY_DOMAIN_SUBSTRING")


def has_rev_proxy_domain_substring():
    return get_rev_proxy_domain_substring() is not None


def get_rev_proxy_secret_header():
    return os.environ.get("ARTEMIS_REVPROXY_AUTH_HEADER", "X-Artemis-Proxy")


def has_rev_proxy_secret_header():
    return get_rev_proxy_secret_header() is not None


def get_rev_proxy_secret():
    return os.environ.get("ARTEMIS_REVPROXY_SECRET", f"{APPLICATION}/revproxy-api-key")


def has_rev_proxy_secret():
    return get_rev_proxy_secret() is not None


def get_rev_proxy_secret_region():
    return os.environ.get("ARTEMIS_REVPROXY_SECRET_REGION", AWS_DEFAULT_REGION)


def has_rev_proxy_secret_region():
    return get_rev_proxy_secret_region() is not None
