import unittest

from utils.deploy_key import create_ssh_url

HTTPS_URL_1 = "https://git.example.com/testorg/testprj/testrepo"

HTTPS_URL_2 = "git@git.example.com:testorg/testprj/testrepo.git"


class TestDeployKeyUtil(unittest.TestCase):
    def test_create_project_url_https(self):
        expected_result = "git@git.example.com:testorg/testprj/testrepo.git"
        result = create_ssh_url(HTTPS_URL_1)
        self.assertEqual(expected_result, result)

    def test_create_project_url_ssh(self):
        expected_result = "git@git.example.com:testorg/testprj/testrepo.git"
        result = create_ssh_url(HTTPS_URL_2)
        self.assertEqual(expected_result, result)
