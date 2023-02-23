from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import Scan
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.util.const import SEVERITY


def get_configuration(scan: Scan) -> PLUGIN_RESULTS:
    configuration = {}
    errors = PluginErrors()
    summary = {}

    for sev in SEVERITY:
        summary[sev] = 0

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.CONFIGURATION.value):
        errors.update(plugin)

        if not plugin.details:
            continue

        for finding in plugin.details:
            id = finding.get("id")
            passing = finding.get("pass)")

            configuration[id] = finding

            if passing != True:
                severity = finding.get("severity")
                summary[severity] += 1

    if plugin is _empty:
        # Loop of configuration plugins never ran so there were no configuration plugin results. In this case the summary
        # should be None to indicate that there were no configuration results instead of that there were configuration results
        # that found no configuration items.
        summary = None

    return PLUGIN_RESULTS(configuration, errors, True, summary)
