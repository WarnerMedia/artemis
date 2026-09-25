import os
from glob import glob
import docker
import uuid
from typing import Optional
import tarfile
from io import BytesIO
from engine.plugins.lib import utils

logger = utils.setup_logging("trivy_sca")
docker_client = docker.from_env()


def install_package_files(path: str, include_dev: bool, root_path: Optional[str] = None):
    """
    If we have a composer.json and not a composer.lock, then generate the lock file.

    Since we're already using dind, this gets rather complicated. We can't create a new container and give it access to
    the volumes from the parent, because we're not running with --privileged, and we don't want to do that for plugins.

    We could install all of the php/composer dependencies inside of the dind image, since that's what we do with npm,
    but we rarely need to use them, and that's a lot of extra work with not much payoff. Composer requires
    a lot of extra packages, vs npm which is just node. And we have to work around the docker-py sdk, so
    this is the only solution I could find that worked. But it isn't very simple.

    # path: absolute path to the composer project inside the parent container (e.g. /tmp/work/foo/bar)
    # include_dev: do we want to include dev dependencies or not
    # root_path: the original root for logging
    """

    COMPOSER_IMAGE = "composer"
    COMPOSER_VERSION = "2.9.3"
    container_name = f"composer_runner_{uuid.uuid4().hex[:8]}"
    container_mount_path = "/app"

    composer_cmd = [
        "composer",
        "update",
        "--quiet",
        "--no-audit",
        "--no-scripts",
        "--no-plugins",
        "--no-security-blocking",
        "--no-install",
        "--no-interaction",
        "--ignore-platform-reqs",
    ]

    if not include_dev:
        composer_cmd.append("--no-dev")

    container = None
    try:
        docker_client.images.pull(COMPOSER_IMAGE, COMPOSER_VERSION)
        # 1. Create the composer container but do not start it yet.
        container = docker_client.containers.create(
            f"{COMPOSER_IMAGE}:{COMPOSER_VERSION}",
            name=container_name,
            command=composer_cmd,
            working_dir=container_mount_path,
        )
        logger.info(f"Created container {container_name}")

        # 2. Use 'docker cp' equivalent (put_archive) to copy composer.json into the container.
        # We need to create a tar archive in memory to stream to the container.
        pw_tarstream = BytesIO()
        pw_tar = tarfile.TarFile(fileobj=pw_tarstream, mode="w")

        composer_json_path = os.path.join(path, "composer.json")
        with open(composer_json_path, "rb") as f:
            composer_json_contents = f.read()

        tarinfo = tarfile.TarInfo(name="composer.json")
        tarinfo.size = len(composer_json_contents)

        pw_tar.addfile(tarinfo, BytesIO(composer_json_contents))
        pw_tar.close()
        pw_tarstream.seek(0)

        container.put_archive(path=container_mount_path, data=pw_tarstream)
        logger.info(f"Copied composer.json to {container_name}:{container_mount_path}")

        # 3. Start the container and wait for it to complete.
        container.start()
        result = container.wait()
        logs = container.logs(stdout=True, stderr=True).decode("utf-8")
        logger.info(f"Container logs for {path.replace(root_path, '') if root_path else path}:\n{logs}")
        logger.info(f"Container exit code: {result.get('StatusCode')}")

        if result.get("StatusCode") == 0:
            # 4. Use 'docker cp' equivalent (get_archive) to copy composer.lock from the container.
            bits, _ = container.get_archive(f"{container_mount_path}/composer.lock")

            # Extract the file from the in-memory tar archive.
            with BytesIO() as f_temp:
                for chunk in bits:
                    f_temp.write(chunk)
                f_temp.seek(0)
                with tarfile.open(fileobj=f_temp, mode="r") as tar:
                    # Get the member (the file) from the archive
                    lockfile_member = tar.getmembers()[0]
                    # Extract it to a temporary object
                    lockfile_content = tar.extractfile(lockfile_member)
                    if lockfile_content:
                        # Write the content to the final destination
                        with open(os.path.join(path, "composer.lock"), "wb") as f_out:
                            f_out.write(lockfile_content.read())
                        logger.info(f"Copied composer.lock from container to {path}")
                    else:
                        logger.error("Failed to extract composer.lock from container archive.")
        else:
            logger.error(f"Composer install failed with exit code {result.get('StatusCode')}")

    except Exception as e:
        logger.error(f"Error during composer lock generation: {e}")
    finally:
        # 5. Clean up the container
        if container:
            try:
                container.remove(force=True)
                logger.info(f"Removed container {container_name}")
            except docker.errors.NotFound:  # type: ignore
                pass  # Container might have failed to be created
            except Exception as e:
                logger.error(f"Error removing container {container_name}: {e}")

    # Final check
    lockfile = os.path.join(path, "composer.lock")
    if not os.path.exists(lockfile):
        logger.error(f"composer.lock was not created in {path}")

    return


def check_composer_package_files(path: str, include_dev: bool, root_path: str = "") -> tuple:
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
            msg = (
                f"No composer.lock file was found in path {sub_path.replace(path, '')}."
                " Please consider creating a composer.lock file for this project."
            )
            logger.warning(msg)
            alerts.append(msg)
            install_package_files(sub_path, include_dev, root_path)
    return errors, alerts
