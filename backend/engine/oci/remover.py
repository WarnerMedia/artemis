import docker
import docker.errors

from artemislib.logging import Logger

logger = Logger("oci_remover")

docker_client = docker.from_env()


def remove_docker_image(tag: str) -> bool:
    """
    Delete a container image from disk after the scan job is complete.
    :param tag: Image tag.
    :return: True if successful.
    """
    logger.info("Removing image: %s", tag)
    try:
        docker_client.images.remove(image=tag, force=True)
    except docker.errors.DockerException:
        logger.warning("Failed to remove image: %s", tag, exc_info=True)
        return False
    return True


def prune_images() -> None:
    """
    Prune the docker images. This removes all the dangling images.
    """
    logger.info("Cleaning up unused images")
    try:
        docker_client.images.prune()
    except docker.errors.DockerException:
        logger.warning("Failed to prune images", exc_info=True)
