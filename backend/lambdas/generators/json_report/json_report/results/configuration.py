from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import Scan
from json_report.results.results import PLUGIN_RESULTS, PluginErrors


def get_configuration(scan: Scan) -> PLUGIN_RESULTS:
    configuration = {}
    errors = PluginErrors()
    summary = {}

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.CONFIGURATION.value):
        errors.update(plugin)
        # TODO add errors

        if not plugin.details:
            continue

        details = plugin.details
        for key in details:
            configuration[key] = details[key]

        for key in configuration:
            # Only count  the failing items towards the summary
            passing_items = filter(lambda item: item.get("pass") != True, configuration[key])
            summary[key] = len(list(passing_items))

    if plugin is _empty:
        # Loop of configuration plugins never ran so there were no configuration plugin results. In this case the summary
        # should be None to indicate that there were no configuration results instead of that there were configuration results
        # that found no configuration items.
        summary = None

    return PLUGIN_RESULTS(configuration, errors, True, summary)
