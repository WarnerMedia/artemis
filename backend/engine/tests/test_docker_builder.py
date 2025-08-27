import json
import os
import subprocess
import unittest
from unittest.mock import patch
import uuid

from artemislib.logging import Logger
from oci import builder

import docker
import docker.errors

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", ".."))

TEST_DATA = os.path.join(TEST_DIR, "data")

TEST_DATA_IMAGE_RESULTS = os.path.join(TEST_DATA, "util", "image_results.json")

TEST_DOCKERFILE_ERROR = os.path.join(TEST_DATA, "image", "Dockerfile.error")
TEST_DOCKERFILE_SIMPLE = os.path.join(TEST_DATA, "image", "Dockerfile.simple")

TEST_PRIVATE_DOCKER_REPOS_CONFIGS = [
    {"url": "test.io", "search": "FROM test", "username": "test-username", "password": "test-password"}
]

TEST_GET_SECRET_WITH_STATUS_MOCK_OUTPUT = {"status": True, "response": json.dumps(TEST_PRIVATE_DOCKER_REPOS_CONFIGS)}

TEST_LOGGER = Logger("oci_builder")


def find_builder(name: str) -> bool:
    """
    Search for a builder by name.
    Raises an exception on failure.
    """

    # Need to use the Docker CLI since Docker-Py does not yet support BuildKit:
    # https://github.com/docker/docker-py/issues/2230
    proc = subprocess.run(
        ["docker", "buildx", "ls", "--format=json"],
        capture_output=True,
        check=True,
    )

    # We assume each object is on a separate line.
    for ris in proc.stdout.decode("utf-8").splitlines():
        obj: dict = json.loads(ris)
        if obj.get("Name") == name:
            return True

    return False


class TestScanImages(unittest.TestCase):
    def test_to_json(self):
        src = builder.ScanImages(
            dockerfile_count=1,
            results=[builder.BuiltImage(status=True, tag_id="foo", dockerfile="path/foo/Dockerfile")],
        )
        parsed = json.loads(src.model_dump_json())
        self.assertEqual(parsed["dockerfile_count"], 1)
        self.assertEqual(
            parsed["results"],
            [
                {"status": True, "tag-id": "foo", "dockerfile": "path/foo/Dockerfile"},
            ],
        )

    def test_from_json(self):
        src = """{
            "dockerfile_count": 4,
            "results": [
                {"status": true, "tag-id": "bar", "dockerfile": "path/bar/Dockerfile"}
            ]
        }"""
        loaded = builder.ScanImages.model_validate_json(src)
        self.assertEqual(loaded.dockerfile_count, 4)
        self.assertEqual(
            loaded.results,
            [
                builder.BuiltImage(status=True, tag_id="bar", dockerfile="path/bar/Dockerfile"),
            ],
        )


class TestImageBuilder(unittest.TestCase):
    def setUp(self) -> None:
        with open(TEST_DATA_IMAGE_RESULTS) as output_file:
            self.demo_results_dict = json.load(output_file)

    def test_find_dockerfiles(self):
        image_builder = builder.ImageBuilder(os.path.join(TEST_ROOT, "Dockerfiles"), None, None, None)
        result = image_builder.find_dockerfiles()
        self.assertGreater(len(result), 5)

    def test_private_docker_repos_login(self):
        image_builder = builder.ImageBuilder(os.path.join(TEST_ROOT, "Dockerfiles"), None, None, None)
        with patch("plugins.lib.utils.get_secret_with_status") as mock_get_secret_with_status:
            with patch("oci.builder.ImageBuilder.docker_login_needed") as mock_docker_login_needed:
                mock_get_secret_with_status.return_value = TEST_GET_SECRET_WITH_STATUS_MOCK_OUTPUT

                # return true to test docker_login arguments
                mock_docker_login_needed.return_value = True

                with patch("plugins.lib.utils.docker_login") as mock_docker_login:
                    mock_docker_login.return_value = True

                    image_builder.private_docker_repos_login(os.path.join(TEST_ROOT, "Dockerfiles"))
                    mock_get_secret_with_status.assert_called_once()

                    mock_docker_login_needed.assert_called_once_with(
                        os.path.join(TEST_ROOT, "Dockerfiles"),
                        TEST_PRIVATE_DOCKER_REPOS_CONFIGS[0]["search"],
                        TEST_PRIVATE_DOCKER_REPOS_CONFIGS[0]["url"],
                    )

                    mock_docker_login.assert_called_once_with(
                        TEST_LOGGER,
                        TEST_PRIVATE_DOCKER_REPOS_CONFIGS[0]["url"],
                        TEST_PRIVATE_DOCKER_REPOS_CONFIGS[0]["username"],
                        TEST_PRIVATE_DOCKER_REPOS_CONFIGS[0]["password"],
                    )

    def test_build_local_image(self):
        self.maxDiff = None
        docker_client = docker.from_env()
        repo_name = "artemis"
        engine_id = "0000000"
        image_builder = builder.ImageBuilder(TEST_DATA, repo_name, None, engine_id)

        result: builder.BuiltImage | None = None
        try:
            result = image_builder.build_local_image(TEST_DOCKERFILE_SIMPLE, "artemis-docker-test")
            self.assertEqual(
                result,
                builder.BuiltImage(
                    status=True,
                    dockerfile="image/Dockerfile.simple",
                    tag_id=f"{repo_name}-artemis-docker-test-{engine_id}",
                ),
            )
            # Confirm that the image was built.
            # Raises ImageNotFound if the image is missing.
            docker_client.images.get(result.tag_id)
        finally:
            if result:
                self.assertTrue(result.remove())

    def test_build_local_image_with_builder(self):
        self.maxDiff = None
        docker_client = docker.from_env()
        repo_name = "artemis"
        engine_id = "00001111"
        image_builder = builder.ImageBuilder(TEST_DATA, repo_name, None, engine_id)

        result: builder.BuiltImage | None = None
        try:
            prefix = f"test-prefix-{uuid.uuid4()}"
            with builder.temporary_builder(prefix) as name:
                result = image_builder.build_local_image(TEST_DOCKERFILE_SIMPLE, "artemis-docker-test", name)
                self.assertEqual(
                    result,
                    builder.BuiltImage(
                        status=True,
                        dockerfile="image/Dockerfile.simple",
                        tag_id=f"{repo_name}-artemis-docker-test-{engine_id}",
                    ),
                )
            # Confirm that the image was built.
            # Raises ImageNotFound if the image is missing.
            docker_client.images.get(result.tag_id)
        finally:
            if result:
                self.assertTrue(result.remove())

    def test_build_local_image_failed(self):
        self.maxDiff = None
        docker_client = docker.from_env()
        repo_name = "artemis"
        engine_id = "11112222"
        image_builder = builder.ImageBuilder(TEST_DATA, repo_name, None, engine_id)

        result: builder.BuiltImage | None = None
        try:
            prefix = f"test-prefix-{uuid.uuid4()}"
            with builder.temporary_builder(prefix) as name:
                result = image_builder.build_local_image(TEST_DOCKERFILE_ERROR, "artemis-docker-test", name)
                self.assertEqual(
                    result,
                    builder.BuiltImage(
                        status=False,
                        dockerfile="image/Dockerfile.error",
                        tag_id=f"{repo_name}-artemis-docker-test-{engine_id}",
                    ),
                )
            # Confirm that the image was not built.
            with self.assertRaises(docker.errors.ImageNotFound):
                docker_client.images.get(result.tag_id)
        finally:
            # Clean up in case the image was built successfully.
            if result:
                result.remove()

    def test_temporary_builder(self):
        prefix = f"test-prefix-{uuid.uuid4()}"
        with builder.temporary_builder(prefix) as name:
            self.assertTrue(name.startswith(prefix))
            self.assertTrue(find_builder(name))
        # Check that the builder was removed.
        self.assertFalse(find_builder(name))
