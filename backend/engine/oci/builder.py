import os
import secrets
import subprocess
from glob import glob
from typing import TypedDict

from artemislib.logging import Logger
from env import ARTEMIS_PRIVATE_DOCKER_REPOS_KEY
from plugins.lib import utils

log = Logger("oci_builder")

BuiltImage = TypedDict(
    "BuiltImage",
    {  # Using alternative form due to hyphen in "tag-id".
        "status": bool,  # True if image was built sucessfully.
        "tag-id": str,
        "dockerfile": str,  # Path relative to the base directory.
    },
)


class BuildResult(TypedDict):
    results: list[BuiltImage]
    dockerfile_count: int


class ImageBuilder:
    def __init__(self, path, repo_name, ignore_prefixes, engine_id):
        """
        Finds and builds any docker images within the path.
        :param path: path to images, typically the root of the repo.
        :param repo_name: name of the repository
        :param ignore_prefixes: Image name prefixes to exclude from untagging
        :param engine_id: id of the engine instance running
        """
        self.path = path
        self.repo_name = repo_name
        self.ignore_prefixes = ignore_prefixes
        self.engine_id = engine_id

    def find_dockerfiles(self) -> list[str]:
        """
        Recursively find all Dockerfiles.
        :return: list
        """
        dockerfiles = glob("%s/**/Dockerfile*" % self.path, recursive=True)
        return [dockerfile for dockerfile in dockerfiles if os.path.isfile(dockerfile)]

    def build_docker_files(self) -> BuildResult:
        """
        Attempt to build all Dockerfiles.
        :return: BuildResult
        """
        results: list[BuiltImage] = []

        # Find and loop through all the Dockerfile* files in the path
        files = self.find_dockerfiles()

        self.private_docker_repos_login(files)

        # Build a set of all directories containing Dockerfiles
        for filename in files:
            if not os.path.isfile(filename):
                continue
            # Build each of the Dockerfiles locally
            results.append(self.build_local_image(filename, secrets.token_hex(16)))

        # Return the results
        return {"results": results, "dockerfile_count": len(files)}

    def build_local_image(self, dockerfile: str, tag: str) -> BuiltImage:
        """
        :param dockerfile: path to dockerfile
        :param tag: tag that we'll use in scan step
        :return: BuiltImage
        """
        dockerfile_name = dockerfile.replace(self.path, "")
        if dockerfile_name.startswith("/"):
            dockerfile_name = dockerfile_name[1:]

        log.info("Attempting to build %s", dockerfile_name)

        tag_id = f"{self.repo_name}-{tag}-{self.engine_id}"
        build_proc = subprocess.run(
            ["docker", "build", "--pull", "--no-cache", "--force-rm", "-q", ".", "-f", dockerfile, "-t", tag_id],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=self.path,
            check=False,
        )
        if build_proc.returncode != 0:
            log.warning(build_proc.stderr.decode("utf-8"))

        status = build_proc.returncode == 0
        log.info("Built %s from %s (success: %s)", tag_id, dockerfile_name, status)

        return {"status": status, "tag-id": tag_id, "dockerfile": dockerfile_name}

    def untag_base_images(self) -> None:
        """
        Remove/untag base images that were pulled as part of building images. Images that are pulled as part of an image
        build will not be deleted when the built image is deleted if they are still tagged. Images that are pulled will
        have a digest while images that are built locally will not. By removing any images that have a digest we'll set
        the up for being deleted when the locally-built images are deleted at the end of the scan. Images that are
        pulled from the Artemis ECR should be excluded from this and are identified by the passed in prefix.
        :return: None
        """
        if self.ignore_prefixes is None:
            self.ignore_prefixes = []
        to_remove = []

        # Get a list of all the image:tag and digests
        r = subprocess.run(
            ["docker", "image", "ls", "--format", "{{.Repository}}:{{.Tag}},{{.Digest}}"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )

        if r.returncode != 0:
            # Log the error and bail
            log.error(r.stderr.decode("utf-8"))
            return

        for line in r.stdout.decode("utf-8").split():
            # Skip any blank lines or images without a digest or any images that are prefixed with the ignore string
            if (
                not line  # Line is blank
                or line.endswith("<none>")  # Image does not have a digest
                or next(filter(lambda prefix: line.startswith(prefix), self.ignore_prefixes), None)
                # Image matches prefix
            ):
                continue

            # Add image:tag to list of images to remove (untag)
            to_remove.append(line.split(",", maxsplit=1)[0])

        # Remove (untag) all the images
        for image in to_remove:
            log.info("Untagging %s", image)
            r = subprocess.run(["docker", "rmi", image], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
            if r.returncode != 0:
                # Log the error but keep going
                log.error(r.stderr.decode("utf-8"))

    def private_docker_repos_login(self, files) -> None:
        """
        Gets Private Docker Repo Config/Credentials from Secrets Manager and login to the Docker Repo if needed.
        :param files: List of Dockerfiles to check
        :return: None
        """
        # Get Artemis private docker repo configs and credentials
        private_docker_repos = utils.get_secret_with_status(ARTEMIS_PRIVATE_DOCKER_REPOS_KEY, log)

        # Convert config and credentials to json format or return if private_docker_repos status shows false
        if private_docker_repos["status"]:
            private_docker_repos_response = utils.convert_string_to_json(private_docker_repos["response"], log)
        else:
            return

        if not private_docker_repos_response:
            # Error already logged in convert_string_to_json.
            return

        # A list of private docker repos with creds stored in Secrets Manager (at ARTEMIS_PRIVATE_DOCKER_REPOS_KEY)
        #
        # Structure:
        # [
        #   {
        #     "url": "Docker login url",
        #     "search": "Search string for identifying whether a Dockerfile uses this repo",
        #     "username": "Private docker repo username",
        #     "password": "Private docker repo password"
        #   }
        # ]
        for repo in private_docker_repos_response:
            log.info("Checking if any Dockerfiles depend on %s", repo["url"])
            if self.docker_login_needed(files, repo["search"], repo["url"]):
                utils.docker_login(log, repo["url"], repo["username"], repo["password"])
            else:
                log.info("No Dockerfiles depend on %s", repo["url"])

    def docker_login_needed(self, files: list, search: str, url: str) -> bool:
        """
        Determine if any Dockerfiles in the list depend on the private repo
        :param files: List of Dockerfiles to check
        :param search: Search string to look for in the Dockerfiles
        :param url: The URL of the Docker repo, for logging purposes
        :return: boolean
        """
        login_required = False
        for file in files:
            with open(file) as f:
                dockerfile = f.read()
                if search in dockerfile:
                    # Log which dockerfiles depend on the repo for troubleshooting purposes
                    dockerfile_name = file.replace(self.path, "")
                    if dockerfile_name.startswith("/"):
                        dockerfile_name = dockerfile_name[1:]
                    log.info("%s login required for %s", url, dockerfile_name)
                    login_required = True
        return login_required


if __name__ == "__main__":
    args = utils.parse_args()
    image_builder = ImageBuilder(
        path=args.path,
        repo_name=args.engine_vars.get("repo", "test-docker"),
        ignore_prefixes=None,
        engine_id=args.engine_vars.get("engine_id", "null"),
    )

    images = image_builder.build_docker_files()
    # Untag any base images that were pulled as part of the image building so that they get cleaned up later
    image_builder.untag_base_images()
    print(images)
