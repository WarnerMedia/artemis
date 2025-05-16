import subprocess
import os
from glob import glob
from engine.plugins.lib import utils
import docker
import docker.errors

logger = utils.setup_logging("trivy_sca")

cmd = [
    "composer",
    "install",
    "--no-scripts",  # Skip execution of scripts
    "--no-audit",  # Don't run an audit
    "&&",
    "ls",
    "-l", 
    "composer.lock"
]

docker_client = docker.from_env()


def install_package_files(include_dev: bool, path: str, root_path: str):
    # Create a composer.lock file if it doesn't already exist
    logger.info(
        f"Generating composer.lock for {path.replace(root_path, '')} (including dev dependencies: {include_dev}"
    )
    if not include_dev:
        cmd.append("--no-dev")

    # Run Composer in a container
    COMPOSER_IMG = "composer:latest"
    container_name = "composer_runner"
    host_working_dir = path
    container_mount_path = "/app"

    container = docker_client.containers.run(
        COMPOSER_IMG,
        name=container_name,
        command=cmd,
        volumes={
            host_working_dir: {"bind": container_mount_path, "mode": "rw"},
        },
        working_dir=container_mount_path,
        auto_remove=False,
        stdout=True,
        stderr=True,
        detach=True,
    )


    exit_code = container.wait()
    logs = container.logs().decode("utf-8")

    logger.error(f'exit code: {exit_code}')
    logger.error(f'logs: {logs}')


    # container.remove()


    return 


def check_composer_package_files(path: str, include_dev: bool) -> tuple:
    """
    Main Function
    Find all of the composer.json files in the repo and build lock files for them if they dont have one already.
    Parses the results and returns them with the errors.
    """

    errors = []
    alerts = []

    # Find and loop through all the composer.json files in the path
    files = glob(f"{path}/**/composer.json", recursive=True)

    logger.info("Found %d composer.json files", len(files))

    # If there are no composer.json files, exit function
    if len(files) == 0:
        return errors, alerts

    # Build a set of all directories containing package files
    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    # Loop through paths that have a package file
    for sub_path in paths:
        lockfile = os.path.join(sub_path, "composer.lock")
        lockfile_missing = not os.path.exists(lockfile)
        # Generate a lock file if does not exist in path that has a composer.json
        if lockfile_missing:
            msg = (
                f"No composer.lock file was found in path {sub_path.replace(path, '')}."
                " Please consider creating a composer.lock file for this project."
            )
            logger.warning(msg)
            alerts.append(msg)
            r = install_package_files(include_dev, sub_path, path)
            # if r.returncode != 0:
            #     error = r.stderr.decode("utf-8")
            #     logger.error(error)
            #     errors.append(error)
            #     return errors, alerts
    # Return the results
    return errors, alerts
