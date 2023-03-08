import os

GITHUB_TOKEN_VAR = "GITHUB_TOKEN"
GITHUB_INSTALLATION_ID_VAR = "GITHUB_APP_ID"
GITHUB_INSTALLATION_PRIVATE_KEY_VAR = "GITHUB_APP_PRIVATE_KEY"

RH_CONFIG_FILE_VAR = "RH_CONFIG_FILE"
RH_GITHUB_CONFIG_VAR = "RH_GITHUB_CONFIG"


def get_github_token():
    return os.environ.get(GITHUB_TOKEN_VAR)


def has_github_token():
    return get_github_token() != None


def get_github_installation_id():
    return os.environ.get(GITHUB_INSTALLATION_ID_VAR)


def has_github_installation_id():
    return get_github_installation_id() != None


def get_github_installation_private_key():
    return os.environ.get(GITHUB_INSTALLATION_PRIVATE_KEY_VAR)


def has_github_installation_private_key():
    return get_github_installation_private_key() != None


def get_config_file():
    return os.environ.get(RH_CONFIG_FILE_VAR)


def has_config_file():
    return get_config_file() != None


def get_github_config():
    return os.environ.get(RH_GITHUB_CONFIG_VAR)


def has_github_config():
    return get_github_config() != None
