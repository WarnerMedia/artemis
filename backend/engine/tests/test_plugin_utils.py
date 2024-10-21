import unittest
from engine.plugins.lib import utils

logger = utils.setup_logging("test_utils")


class TestPluginUtils(unittest.TestCase):
    def test_parse_args(self):
        in_args = ['{"foo": "bar"}', "/work/base", "--test=foo"]

        args = utils.parse_args(
            in_args=in_args, extra_args=[[["--test"], {"dest": "test", "type": str, "nargs": "?", "default": "bar"}]]
        )

        self.assertEqual(args.engine_vars["foo"], "bar")
        self.assertEqual(args.path, "/work/base/")
        self.assertEqual(args.test, "foo")

    def test_validate_plugin_name(self):
        test_cases: list[tuple[str, bool]] = [
            ("foo", True),
            ("bar_baz", True),
            ("Quux", True),
            ("__init__", False),
            ("lib", False),
        ]
        for test_case in test_cases:
            with self.subTest(test_case=test_case):
                actual = utils.validate_plugin_name(test_case[0])
                self.assertEqual(actual, test_case[1])
