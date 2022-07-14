import os
import unittest
from importlib import reload

import repo.util.const
import repo.util.env

test_plugin_envs = {
    "ARTEMIS_FEATURE_AQUA_ENABLED": "aqua_cli_scanner",
    "ARTEMIS_FEATURE_VERACODE_ENABLED": "veracode_sca",
}


class TestRepoConsts(unittest.TestCase):
    def test_plugin_list_plugins_enabled(self):
        for plugin_env, plugin_name in test_plugin_envs.items():
            for test_case in ["1", "0"]:
                with self.subTest(plugin_name=plugin_name, test_case=test_case):
                    # Set the ARTEMIS_FEATURE_AQUA_ENABLED ENV VAR to match the test
                    os.environ[plugin_env] = test_case

                    # Reload the env and const modules
                    reload(repo.util.env)
                    reload(repo.util.const)

                    # Check if the Aqua plugin is included or not in the plugins list
                    actual = plugin_name in repo.util.const.PLUGINS
                    self.assertEqual(actual, test_case == "1")
