import subprocess
import os
import shutil
from glob import glob
from engine.plugins.lib import utils
import docker
import docker.errors
import uuid

logger = utils.setup_logging("trivy_sca")
docker_client = docker.from_env()  # Ensure docker_client is initialized

def install_package_files(include_dev: bool, path: str, root_path: str, volname: str):
    logger.info(f"Mounting volume: {volname} to /tmp/work in composer container")
    logger.info(f"Host dir contents: {os.listdir(path)}")
    logger.info(f"composer.json exists: {os.path.exists(os.path.join(path, 'composer.json'))}")

    composer_cmd = (
        "composer --version && "
        "ls -l && "
        "cat composer.json && "
        "composer install --no-scripts -vvv"
        " && ls -l composer.lock && ls -l"
    )
    if not include_dev:
        composer_cmd += " --no-dev"

    COMPOSER_IMG = "composer:latest"
    container_name = f"composer_runner_{uuid.uuid4().hex[:8]}"
    container_mount_path = "/tmp/work"

    try:
        container = docker_client.containers.run(
            COMPOSER_IMG,
            name=container_name,
            command=["sh", "-c", composer_cmd],
            volumes={
                volname: {"bind": container_mount_path, "mode": "rw"},
            },
            working_dir=container_mount_path,
            auto_remove=False,
            stdout=True,
            stderr=True,
            detach=True,
        )

        result = container.wait()
        logs = container.logs(stdout=True, stderr=True).decode("utf-8")
        logger.info(f"Container logs for {path.replace(root_path, '')}:\n{logs}")
        logger.info(f"Container exit code: {result.get('StatusCode')}")
        container.remove()
    except Exception as e:
        logger.error(f"Error running composer install in Docker: {e}")

    # Check if composer.lock was created in the volume mount path
    lockfile = os.path.join(path, "composer.lock")
    if not os.path.exists(lockfile):
        logger.error(f"composer.lock was not created in {path}")

    return 


def check_composer_package_files(path: str, include_dev: bool, volname: str) -> tuple:
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

            # Use the shared volume mount path
            volume_mount_path = "/tmp/work"
            if not os.path.exists(volume_mount_path):
                os.makedirs(volume_mount_path, exist_ok=True)
            shutil.copy2(os.path.join(sub_path, "composer.json"), os.path.join(volume_mount_path, "composer.json"))
            # Optionally copy other files if needed (e.g., auth.json, php.ini)
            for extra_file in ["auth.json", "php.ini"]:
                src = os.path.join(sub_path, extra_file)
                dst = os.path.join(volume_mount_path, extra_file)
                if os.path.exists(src):
                    shutil.copy2(src, dst)

            install_package_files(include_dev, volume_mount_path, path, volname)

            generated_lockfile = os.path.join(volume_mount_path, "composer.lock")
            if os.path.exists(generated_lockfile):
                shutil.copy2(generated_lockfile, os.path.join(sub_path, "composer.lock"))

    return errors, alerts
