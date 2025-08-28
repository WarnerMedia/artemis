import os
from glob import glob
from engine.plugins.lib import utils
import docker
import uuid
from typing import Optional

logger = utils.setup_logging("trivy_sca")
docker_client = docker.from_env()


def install_package_files(include_dev: bool, sub_path: str, working_src: str, root_path: str):
    # sub_path: absolute path to the composer project inside the parent container (e.g. /tmp/work/foo/bar)
    # temp_vol_name: Docker volume name (e.g. artemis-plugin-temp-xxxx)
    # temp_vol_mount: mount path inside the plugin container (e.g. /tmp/work)
    # root_path: the original root for logging

    rel_subdir = os.path.relpath(sub_path, working_src)
    abs_path_in_container = os.path.join("/app", rel_subdir)
    logger.info(f"Mounting volume: {working_src} to /app in composer container")
    logger.info(f"Target subdir in container: {abs_path_in_container}")
    logger.info(f"composer.json: {os.path.join(sub_path, 'composer.json')}")
    logger.info(f"composer.json exists: {os.path.exists(os.path.join(sub_path, 'composer.json'))}")

    composer_cmd = (
        "composer --version && "
        "ls -l && "
        "cat composer.json && "
        "composer install --no-scripts -q"
        " && ls -l composer.lock && ls -l"
    )

    if not include_dev:
        composer_cmd += " --no-dev"

    COMPOSER_IMG = "composer:latest"
    container_name = f"composer_runner_{uuid.uuid4().hex[:8]}"
    container_mount_path = "/app"

    try:
        container = docker_client.containers.run(
            COMPOSER_IMG,
            name=container_name,
            command=["sh", "-c", composer_cmd],
            volumes={
                working_src: {"bind": container_mount_path, "mode": "rw"},
            },
            working_dir=abs_path_in_container,
            auto_remove=False,
            stdout=True,
            stderr=True,
            detach=True,
        )

        result = container.wait()
        logs = container.logs(stdout=True, stderr=True).decode("utf-8")
        logger.info(f"Container logs for {sub_path.replace(root_path, '')}:\n{logs}")
        logger.info(f"Container exit code: {result.get('StatusCode')}")
        container.remove()
    except Exception as e:
        logger.error(f"Error running composer install in Docker: {e}")

    # Check if composer.lock was created
    lockfile = os.path.join(sub_path, "composer.lock")
    if not os.path.exists(lockfile):
        logger.error(f"composer.lock was not created in {sub_path}")

    return


def check_composer_package_files(
    path: str, working_src: str, include_dev: bool, root_path: Optional[str] = None
) -> tuple:
    """
    Find all composer.json files in the repo and build lock files for them if missing.
    """
    errors = []
    alerts = []
    logger.info("Searching %s for composer files", path)
    files = glob(f"{path}/**/composer.json", recursive=True)
    logger.info("Found %d composer.json files", len(files))

    if len(files) == 0:
        return errors, alerts

    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    for sub_path in paths:
        lockfile = os.path.join(sub_path, "composer.lock")
        lockfile_missing = not os.path.exists(lockfile)
        if lockfile_missing:
            install_package_files(include_dev, sub_path, working_src, root_path or working_src)
    return errors, alerts
