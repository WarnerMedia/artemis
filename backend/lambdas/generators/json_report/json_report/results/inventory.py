from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import Scan

from json_report.results.results import PLUGIN_RESULTS, PluginErrors


def get_inventory(scan: Scan) -> PLUGIN_RESULTS:
    inventory = {}
    errors = PluginErrors()
    summary = {}

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.INVENTORY.value):
        errors.update(plugin)

        if not plugin.details:
            continue

        details = plugin.details
        for key in details:
            inventory[key] = details[key]

        for key in inventory:
            if isinstance(inventory[key], list):
                summary[key] = len(inventory[key])
            elif isinstance(inventory[key], dict):
                summary[key] = len(inventory[key].keys())

    if plugin is _empty:
        # Loop of inventory plugins never ran so there were no inventory plugin results. In this case the summary
        # should be None to indicate that there were no inventory results instead of that there were inventory results
        # that found no inventory items.
        summary = None

    return PLUGIN_RESULTS(inventory, errors, True, summary)
