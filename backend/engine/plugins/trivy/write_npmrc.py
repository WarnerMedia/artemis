import os
from engine.plugins.lib import utils

NODE_CRED_KEY = "node-dep-creds"

log = utils.setup_logging("trivy")


def handle_npmrc_creation(paths: set, home_dir=None) -> bool:
    """
    Main npmrc creation function. Checks if the .npmrc file exists, and if not,
    gets and writes the private registries currently in the package.jsons
    """
    # Determine the location of .npmrc but only proceed if it doesn't exist
    if home_dir is None:
        home_dir = os.environ["HOME"]
    npmrc = os.path.join(home_dir, ".npmrc")
    if os.path.exists(npmrc):
        log.info("%s already exists, skipping", npmrc)
        return False

    scope_list = get_config_matches_in_packages(paths)
    if not scope_list:
        log.info("No supported private packages found. Skipping .npmrc creation.")
        return False
    write_npmrc(npmrc, scope_list)
    return True


def get_config_matches_in_packages(paths: set) -> list:
    """
    - Gets a list of the private scopes supported from Secrets Manager.
    - Checks to see if the package.jsons in our paths have any supported private scopes.
    - If so, the scopes are saved in a list and returned.
    return: List of private scopes
    """
    # get list of configs to check for
    configs = get_scope_configs()
    if configs is None:
        log.warning("List of configs is empty. Skipping .npmrc creation.")
        return None

    private_scope_list = []

    # Loop through the package file and look for private scopes that we support
    # and flag those for inclusion
    for path in paths:
        package_file = os.path.join(path, "package.json")
        with open(package_file) as f:
            contents = f.read()
            for config in configs:
                if f'"@{config["scope"]}/' in contents:
                    log.info(f"%s has @%s packages", package_file, config["scope"])
                    private_scope_list.append(config)
    return private_scope_list


def get_scope_configs():
    """
    grabs the list of private registries from secrets manager
    """
    creds = utils.get_secret(NODE_CRED_KEY, log)
    if not creds:
        log.error("Unable to retrieve Node registry configs.")
        return None
    return creds


def build_npm_config(scope, registry, token, username, email, **kwargs):
    """
    gets the variables necessary to return the npmrc config.
    This provides npm the necessary info to get packages from private sources.
    **kwargs exists at the end to pick up anything extra in the config dictionary that we dont need.
    """
    return (
        f"@{scope}:registry=https://{registry}\n"
        f"//{registry}:_password={token}\n"
        f"//{registry}:username={username}\n"
        f"//{registry}:email={email}\n"
        f"//{registry}:always-auth=true\n"
    )


def write_npmrc(npmrc, scope_list: list) -> None:
    # Write the configs for flagged scopes to npmrc
    with open(npmrc, "a") as f:
        for scope in scope_list:
            log.info(f"Writing {scope['scope']} config to %s", npmrc)
            f.write(build_npm_config(**scope))