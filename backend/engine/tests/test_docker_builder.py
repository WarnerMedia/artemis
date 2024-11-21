import json
import os
import unittest
from unittest.mock import patch

import pytest

from artemislib.logging import Logger
from oci import builder

TEST_DIR = os.path.dirname(os.path.abspath(__file__))

TEST_ROOT = os.path.abspath(os.path.join(TEST_DIR, "..", ".."))

TEST_DATA = os.path.join(TEST_DIR, "data")

TEST_DATA_IMAGE_RESULTS = os.path.join(TEST_DATA, "util", "image_results.json")

TEST_DOCKERFILE_LIST = [os.path.join(TEST_DATA, "image", "test_file_for_docker")]

TEST_PRIVATE_DOCKER_REPOS_CONFIGS = [
    {"url": "test.io", "search": "FROM test", "username": "test-username", "password": "test-password"}
]

TEST_GET_SECRET_WITH_STATUS_MOCK_OUTPUT = {"status": True, "response": json.dumps(TEST_PRIVATE_DOCKER_REPOS_CONFIGS)}

TEST_LOGGER = Logger("oci_builder")


class TestDockerUtil(unittest.TestCase):
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

    @pytest.mark.integtest
    def test_build_local_image(self):
        self.maxDiff = None
        repo_name = "artemis"
        engine_id = "0000000"
        expected_result = {
            "dockerfile": "image/test_file_for_docker",
            "status": True,
            "tag-id": f"{repo_name}-docker-test-{engine_id}",
        }
        image_builder = builder.ImageBuilder(TEST_DATA, repo_name, None, engine_id)
        result = image_builder.build_local_image(TEST_DOCKERFILE_LIST[0], "docker-test")
        self.assertEqual(expected_result, result)
