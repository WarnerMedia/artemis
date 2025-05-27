import subprocess
import os
from glob import glob
from engine.plugins.lib import utils
import docker
import docker.errors
import uuid

logger = utils.setup_logging("trivy_sca")
docker_client = docker.from_env()  # Ensure docker_client is initialized

def install_package_files(include_dev: bool, path: str, root_path: str):
    logger.info(f"Mounting host dir: {path} to /app in composer container")
    logger.info(f"Host dir contents: {os.listdir(path)}")
    logger.info(f"composer.json exists: {os.path.exists(os.path.join(path, 'composer.json'))}")

    composer_cmd = "composer install --no-scripts --no-audit"
    if not include_dev:
        composer_cmd += " --no-dev"
    composer_cmd += " && ls -l composer.lock && ls -l"

    COMPOSER_IMG = "composer:latest"
    container_name = f"composer_runner_{uuid.uuid4().hex[:8]}"
    host_working_dir = path
    container_mount_path = "/app"

    try:
        container = docker_client.containers.run(
            COMPOSER_IMG,
            name=container_name,
            command=["sh", "-c", composer_cmd],
            volumes={
                host_working_dir: {"bind": container_mount_path, "mode": "rw"},
            },
            working_dir=container_mount_path,
            auto_remove=False,  # Set to False to fetch logs, then remove manually
            stdout=True,
            stderr=True,
            detach=True,
            user=os.getuid(),
        )

        result = container.wait()
        logs = container.logs(stdout=True, stderr=True).decode("utf-8")
        logger.info(f"Container logs for {path.replace(root_path, '')}:\n{logs}")
        logger.info(f"Container exit code: {result.get('StatusCode')}")
        container.remove()
    except Exception as e:
        logger.error(f"Error running composer install in Docker: {e}")

    # Check if composer.lock was created
    lockfile = os.path.join(path, "composer.lock")
    if not os.path.exists(lockfile):
        logger.error(f"composer.lock was not created in {path}")

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
