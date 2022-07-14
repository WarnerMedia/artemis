import io
import json
import unittest
from contextlib import redirect_stdout

from mock import MagicMock, patch

from engine.plugins.base_images.main import (
    build_event_info,
    extract_imagetag,
    find_from_lines,
    main,
    process_from_lines,
    split_image_and_tag,
)
from engine.plugins.lib import utils


class TestBaseImages(unittest.TestCase):
    def test_split_image_and_tag(self):
        test_cases = {
            "python": ("python", "latest", False),
            "python:3.7": ("python", "3.7", False),
            "python@abc123": ("python", "abc123", True),
            "$VAR:3.7": (None, "3.7", False),
            "$VAR@abc123": (None, "abc123", True),
            "python:$VAR": ("python", "latest", False),
            "python@$VAR": ("python", "latest", False),
            "php-$VAR:7.3": (None, "7.3", False),
        }
        for input_str, (expected_image, expected_tag, expected_digest) in test_cases.items():
            with self.subTest(input_str=input_str):
                image, tag, digest = split_image_and_tag(input_str)
                self.assertEqual(image, expected_image)
                self.assertEqual(tag, expected_tag)
                self.assertEqual(digest, expected_digest)

    def test_extract_imagetag(self):
        test_cases = {
            "FROM python": "python",
            "FROM --platform=noarch python": "python",
            "FROM python:3.7 AS BUILDER": "python:3.7",
            "FROM --platform=noarch python@abc123 AS builder": "python@abc123",
            "FROM $VAR1:$VAR2": "$VAR1:$VAR2",
        }
        for input_str, expected in test_cases.items():
            with self.subTest(input_str=input_str):
                actual = extract_imagetag(input_str)
                self.assertEqual(actual, expected)

    def test_process_from_lines(self):
        from_lines = [
            "FROM python",
            "FROM python:3.7",
            "FROM golang",
            "FROM java@abc123",
            "FROM nginx:$VAR",
            "FROM php-$VAR:7.3",
        ]

        results = process_from_lines(from_lines)
        self.assertDictEqual(
            results,
            {
                "python": {"tags": ["latest", "3.7"], "digests": []},
                "golang": {"tags": ["latest"], "digests": []},
                "java": {"tags": [], "digests": ["abc123"]},
                "nginx": {"tags": ["latest"], "digests": []},
            },
        )

    @patch("engine.plugins.base_images.main.subprocess")
    def test_find_from_lines(self, subproc):
        test_cases = {(b"FROM python\nFROM golang\n", 0): ["FROM python", "FROM golang"], (b"", 1): []}
        for (output, returncode), expected in test_cases.items():
            with self.subTest(test_case=output):
                mock_output = MagicMock()
                mock_output.stdout = output
                mock_output.returncode = returncode
                subproc.run.return_value = mock_output
                actual = find_from_lines(utils.CODE_DIRECTORY)
                self.assertListEqual(actual, expected)

    @patch("engine.plugins.base_images.main.find_from_lines")
    def test_main(self, mock_find_from_lines):
        test_cases = [
            {
                "return_value": ["FROM python", "FROM golang"],
                "expected_details": {
                    "base_images": {
                        "python": {"tags": ["latest"], "digests": []},
                        "golang": {"tags": ["latest"], "digests": []},
                    }
                },
                "expected_event_info": {"base_images": ["python:latest", "golang:latest"]},
                "expected_success": True,
            },
            {"return_value": {}, "expected_details": {}, "expected_event_info": [], "expected_success": False},
        ]
        for test_case in test_cases:
            with self.subTest(return_value=test_case["return_value"]):
                mock_find_from_lines.return_value = test_case["return_value"]
                stdout = io.StringIO()
                with redirect_stdout(stdout):
                    main([])
                actual = stdout.getvalue().strip()
                expected = json.dumps(
                    {
                        "success": test_case["expected_success"],
                        "details": test_case["expected_details"],
                        "truncated": False,
                        "event_info": test_case["expected_event_info"],
                    }
                )
                self.assertEqual(actual, expected)

    def test_build_event_info(self):
        scan_results = {
            "python": {"tags": ["latest", "3.7"], "digests": []},
            "golang": {"tags": ["latest"], "digests": []},
            "java": {"tags": [], "digests": ["abc123"]},
        }
        expected = ["python:latest", "python:3.7", "golang:latest", "java@abc123"]

        actual = build_event_info(scan_results)
        self.assertListEqual(actual, expected)
