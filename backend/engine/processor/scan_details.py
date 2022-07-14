import os
from env import DEFAULT_DEPTH, DEFAULT_INCLUDE_DEV, ENGINE_DIR, WORKING_DIR

OBJECTS_DIR = os.path.dirname(os.path.abspath(__file__))


class ScanDetails:
    def __init__(self, details: dict):
        self.scan_id = details["scan_id"]
        self.scan_working_dir = os.path.join(WORKING_DIR, self.scan_id)
        self.url = details["url"]
        self.branch = details.get("branch")
        self.public = details.get("public", True)
        self.repo_size = details.get("repo_size", 0)
        self.plugin_path = f"{ENGINE_DIR}/plugins"
        self.plugins = _get_plugins(self.plugin_path, details.get("plugins"))
        self.depth = details.get("depth", DEFAULT_DEPTH)
        self.include_dev = details.get("include_dev", DEFAULT_INCLUDE_DEV)
        self.diff_base = details.get("diff_base")
        self.diff_compare = self.branch

    def alter_diff_to_default(self):
        # The diff_base was fetched when the repo was pulled so switch to FETCH_HEAD.
        self.diff_base = "FETCH_HEAD"
        self.diff_compare = "HEAD"


def _get_plugins(plugin_path, requested_plugins):
    # get the list of total plugins from this directory, excluding files and
    # lib directory

    dirs = os.listdir(plugin_path)
    plugins = [d for d in dirs if os.path.isdir(os.path.join(plugin_path, d))]
    plugins.remove("lib")  # skip the lib directory which is not a plugin
    plugins = set(plugins)
    # allow users to specify a list of specific plugins to include or (if
    # prepended with a '-') to exclude
    if requested_plugins:
        excluding = requested_plugins[0].startswith("-")
        if excluding:
            requested_plugins = [p[1:] for p in requested_plugins]
            # can only include or exclude but not both so all following are excluded
            plugins = plugins.difference(set(requested_plugins))
        else:
            # filter out bogus names
            plugins = plugins.intersection(set(requested_plugins))
    return list(plugins)
