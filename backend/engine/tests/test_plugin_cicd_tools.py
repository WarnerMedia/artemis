import io
import json
import unittest

from pathlib import Path

from unittest.mock import patch, mock_open
from engine.plugins.cicd_tools.main import main
from contextlib import redirect_stdout


BASE = "/work/base"


def get_mock_rglob(result_dict):
    return lambda pattern: result_dict[pattern] if pattern in result_dict else []


class TestPluginCICDTools(unittest.TestCase):
    @patch("pathlib.Path.rglob")
    def test_main(self, mock_rglob):
        mock_rglob.side_effect = get_mock_rglob({})

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            main([])

        actual_raw = stdout.getvalue()
        actual = json.loads(actual_raw)

        self.assertEqual({}, actual.get("details").get("cicd_tools"))

    @patch("pathlib.Path.rglob")
    def test_main_with_pattern_detector(self, mock_rglob):
        expected_file = ".github/workflows/build.yaml"
        mock_rglob.side_effect = get_mock_rglob(
            {
                ".github/workflows/*.yml": [Path(f"{BASE}/{expected_file}")],
            },
        )

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            main([])

        actual_raw = stdout.getvalue()
        actual = json.loads(actual_raw)

        self.assertIn("github_actions", actual.get("details").get("cicd_tools"))
        self.assertIn(
            {"path": expected_file}, actual.get("details").get("cicd_tools").get("github_actions").get("configs")
        )

    @patch("pathlib.Path.rglob")
    def test_main_with_aws_codebuild_detector(self, mock_rglob):
        expected_dir = "cicd/buildspec"
        expected_dir_file = "us-east-2/deploy.yml"
        expected_file = "buildspec.yml"

        mock_rglob.side_effect = get_mock_rglob(
            {
                "**/*buildspec*/": [Path(f"{BASE}/{expected_dir}/")],
                "**/*.yml": [Path(f"{BASE}/{expected_dir}/{expected_dir_file}")],
                "**/*buildspec*.yml": [Path(f"{BASE}/{expected_file}")],
            }
        )

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            main([])

        actual_raw = stdout.getvalue()
        actual = json.loads(actual_raw)

        self.assertIn("aws_codebuild", actual.get("details").get("cicd_tools"))
        self.assertIn(
            {"path": f"{expected_dir}/{expected_dir_file}"},
            actual.get("details").get("cicd_tools").get("aws_codebuild").get("configs"),
        )
        self.assertIn(
            {"path": expected_file}, actual.get("details").get("cicd_tools").get("aws_codebuild").get("configs")
        )

    @patch(
        "pathlib.Path.open",
        new_callable=mock_open,
        read_data=json.dumps(
            {
                "config": {
                    "forge": {
                        "test": True,
                    },
                },
            }
        ),
    )
    @patch("pathlib.Path.is_file")
    @patch("pathlib.Path.rglob")
    def test_main_with_electron_forge_detector(self, mock_rglob, mock_is_file, _mock_open):
        expected_package_json = "package.json"
        expected_file = "forge.config.js"

        mock_rglob.side_effect = get_mock_rglob(
            {
                "**/forge.config.js": [Path(f"{BASE}/{expected_file}")],
                "**/package.json": [Path(f"{BASE}/{expected_package_json}")],
            }
        )
        mock_is_file.return_value = True

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            main([])

        actual_raw = stdout.getvalue()
        actual = json.loads(actual_raw)

        self.assertIn("electron_forge", actual.get("details").get("cicd_tools"))
        self.assertIn(
            {"path": expected_package_json},
            actual.get("details").get("cicd_tools").get("electron_forge").get("configs"),
        )
        self.assertIn(
            {"path": expected_file}, actual.get("details").get("cicd_tools").get("electron_forge").get("configs")
        )

    @patch(
        "pathlib.Path.open",
        new_callable=mock_open,
        read_data=json.dumps({"this_doesnt_have_config": True}),
    )
    @patch("pathlib.Path.is_file")
    @patch("pathlib.Path.rglob")
    def test_main_with_electron_forge_detector_package_json_fail(self, mock_rglob, mock_is_file, _mock_open):
        expected_package_json = "package.json"
        expected_file = "forge.config.js"

        mock_rglob.side_effect = get_mock_rglob(
            {
                "**/forge.config.js": [Path(f"{BASE}/{expected_file}")],
                "**/package.json": [Path(f"{BASE}/{expected_package_json}")],
            }
        )
        mock_is_file.return_value = True

        stdout = io.StringIO()
        with redirect_stdout(stdout):
            main([])

        actual_raw = stdout.getvalue()
        actual = json.loads(actual_raw)

        self.assertIn("electron_forge", actual.get("details").get("cicd_tools"))
        self.assertNotIn(
            {"path": expected_package_json},
            actual.get("details").get("cicd_tools").get("electron_forge").get("configs"),
        )
        self.assertIn(
            {"path": expected_file}, actual.get("details").get("cicd_tools").get("electron_forge").get("configs")
        )
