import os
from datetime import datetime, timedelta, timezone
import boto3
from botocore.exceptions import ClientError

from artemislib.logging import Logger
from oci import remover
from oci.builder import ScanImages, BuiltImage, ImageBuilder
from env import APPLICATION, ECR, REGION

DYNAMODB_TTL_DAYS = 60
log = Logger(__name__)


def check_disk_space(repo_size: int, available_space=None) -> bool:
    """
    Compares the repo size * 2 to the available disk space.
    :param available_space: For testing: provides the available space in KB
    :param repo_size: size of the repository in KB
    :return: True if the available space is greater than the repo size, otherwise False
    """
    if available_space is None:
        s = os.statvfs("/work")
        available_space = (s.f_frsize * s.f_bavail) / 1024

    log.info(
        f"Available Disk Space: {available_space}, Repository Size: {repo_size}",
        extra={"repo_size": repo_size, "available_disk_space": available_space},
    )

    if repo_size >= available_space:
        return False
    return True


def get_ttl_expiration():
    return int((datetime.now(timezone.utc) + timedelta(days=DYNAMODB_TTL_DAYS)).timestamp())


def _build_docker_images(path: str, repo_name: str, engine_id: str, untag_images=True) -> ScanImages:
    """
    Using the ImageBuilder, searches the repository for Dockerfiles, and attempts to build them using unique tags.
    Returns a list of image names and whether they built successfully
    :param path: directory used to recursively find Dockerfiles
    :param repo_name: name of repository, so as to name the built images appropriately
    :param engine_id: Id of the engine container, for the purposes of naming the built image
    :param untag_images: For testing purposes: whether to untag all other images not being scanned.
    :return: image dict that looks like {results: [], dockerfile_count: int}
    """
    image_builder = ImageBuilder(
        path=path, repo_name=repo_name, ignore_prefixes=f"{ECR}/{APPLICATION}/", engine_id=engine_id
    )
    images = image_builder.build_docker_files()
    if untag_images:
        # Untag any base images that were pulled as part of the image building so that they get cleaned up later
        image_builder.untag_base_images()
    return images


def cleanup_images(images: list[BuiltImage]) -> None:
    """
    removes the list of images built to be scanned by the image scanning plugins
    prunes any untagged images.
    :param images: list of images.
    :return: None
    """
    for image in images:
        if not image.remove():
            log.error("Failed to remove image: %s", image.tag_id)
    # Prune images after removing (untagging), since this may leave
    # behind unreferenced objects we can clean up.
    remover.prune_images()


def get_key(secret_name: str, region=REGION):
    """
    Gets secret key from AWS Secrets Manager
    """
    # Create a Secrets Manager client
    session = boto3.session.Session()
    client = session.client(service_name="secretsmanager", region_name=region)

    try:
        return client.get_secret_value(SecretId=secret_name)
    except ClientError as e:
        if e.response["Error"]["Code"] in (
            "DecryptionFailureException",
            "InternalServiceErrorException",
            "InvalidParameterException",
            "InvalidRequestException",
            "ResourceNotFoundException",
        ):
            raise e
        log.error(e.response)
        return None
