import unittest
from engine.plugins.lib import utils

logger = utils.setup_logging("test_utils")


class TestUtils(unittest.TestCase):
    def test_parse_args(self):
        in_args = ['{"foo": "bar"}', "/work/base", "--test=foo"]

        args = utils.parse_args(
            in_args=in_args, extra_args=[[["--test"], {"dest": "test", "type": str, "nargs": "?", "default": "bar"}]]
        )

        self.assertEqual(args.engine_vars["foo"], "bar")
        self.assertEqual(args.path, "/work/base/")
        self.assertEqual(args.test, "foo")
