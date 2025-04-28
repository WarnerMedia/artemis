import unittest

from plugins.snyk.main import _get_description

TEST_DESCRIPTION_1 = (
    "## Overview\n[ini](https://www.npmjs.org/package/ini) is an An ini encoder/decoder for "
    "node\n\nBla bla bla, bla bla bla bla.\r\n\r\n## PoC by Eugene Lim\r\n\r\npayload.ini\r\n```\r\n[ "
)


EXPECTED_DESCRIPTION_1 = (
    "[ini](https://www.npmjs.org/package/ini) is an An ini encoder/decoder for node\n\nBla bla bla, bla bla bla bla."
)


class TestPluginSnyk(unittest.TestCase):
    def test_get_description(self):
        self.maxDiff = None
        result = _get_description(TEST_DESCRIPTION_1)

        self.assertEqual(EXPECTED_DESCRIPTION_1, result)
