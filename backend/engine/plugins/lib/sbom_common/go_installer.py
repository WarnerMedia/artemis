import subprocess
import os
from glob import glob
from engine.plugins.lib import utils

logger = utils.setup_logging("Go Installer (SBOM)")

cmd = [
    "go",
    "mod",
    "download",
]


def download_packages(path, root_path):
    logger.info(f'Downloading Go Mod packages for {path.replace(root_path, "")})')
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)


def go_mod_download(path: str) -> tuple:
    """
    Main Function
    Find all of the go.mod files in the repo and download the dependencies.
    """

    errors = []
    alerts = []

    # Find and loop through all the package.json files in the path
    files = glob("%s/**/go.mod" % path, recursive=True)

    logger.info("Found %d go.mod files", len(files))

    # If there are no package.json files, exit function
    if len(files) == 0:
        return errors, alerts

    # Build a set of all directories containing package files
    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    # Loop through paths that have a go.mod file and run go mod download
    for sub_path in paths:
        msg = (
            f"Installing Go packages in path {sub_path.replace(path, '')}."
            "Please lock package versions for the most accurate results possible."
        )
        logger.warning(msg)
        alerts.append(msg)
        r = download_packages(sub_path, path)
        if r.returncode != 0:
            error = r.stderr.decode("utf-8")
            logger.error(error)
            errors.append(error)
            return errors, alerts
    # Return the results
    return errors, alerts
