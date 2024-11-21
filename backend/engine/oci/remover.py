import subprocess

from artemislib.logging import Logger

logger = Logger("oci_remover")


def remove_docker_image(image: dict):
    """
    Delete docker image from disk after aqua scans it
    :param image:
    :return:
    """
    logger.info("Removing image %s", image["tag-id"])
    return {
        "image-id": image["tag-id"],
        "status": subprocess.run(
            ["docker", "image", "rm", "-f", image["tag-id"]],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        ).returncode
        == 0,
    }


def prune_images() -> None:
    """
    Prune the docker images. This removes all the dangling images.
    """
    logger.info("Cleaning up unused images")
    r = subprocess.run(
        ["docker", "image", "prune", "--force"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False
    )
    if r.returncode != 0:
        logger.error(r.stderr.decode("utf-8"))
