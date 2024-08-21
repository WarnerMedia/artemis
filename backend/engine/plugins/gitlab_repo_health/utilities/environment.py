import os
from artemislib.aws import AWS_DEFAULT_REGION

APPLICATION = os.environ.get("APPLICATION", "artemis")


def get_rev_proxy_domain_substring():
    return os.environ.get("REV_PROXY_DOMAIN_SUBSTRING")


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
