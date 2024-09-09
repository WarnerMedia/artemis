import os
from env import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET, REV_PROXY_SECRET_HEADER, REV_PROXY_SECRET_REGION

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
    return REV_PROXY_DOMAIN_SUBSTRING


def has_rev_proxy_domain_substring():
    return get_rev_proxy_domain_substring() is not None


def get_rev_proxy_secret_header():
    return REV_PROXY_SECRET_HEADER


def has_rev_proxy_secret_header():
    return get_rev_proxy_secret_header() is not None


def get_rev_proxy_secret():
    return REV_PROXY_SECRET


def has_rev_proxy_secret():
    return get_rev_proxy_secret() is not None


def get_rev_proxy_secret_region():
    return REV_PROXY_SECRET_REGION


def has_rev_proxy_secret_region():
    return get_rev_proxy_secret_region() is not None
