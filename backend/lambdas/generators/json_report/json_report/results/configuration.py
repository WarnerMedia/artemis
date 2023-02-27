from datetime import datetime, timezone

from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import AllowListType, Scan
from django.db.models import Q
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.util.const import SEVERITY, WL_CONFIGURATION_KEYS
from json_report.util.util import dict_eq


def get_configuration(scan: Scan, params: dict) -> PLUGIN_RESULTS:
    """
    Unify the output of configuration plugins
    NOTE: unit tests are located at api/tests/test_generate_report.py
    Inspect tests for expected output format.
    :param scan: django object of Artemis repo scan
    :param params: Only used for filtering severity
    :return: dictionary of configuration results, list of errors, and boolean success
    """

    configuration = {}
    errors = PluginErrors()
    summary = {}

    for sev in SEVERITY:
        summary[sev] = 0

    filtered_severities = params.get("severity", SEVERITY)

    # Pull the non-expired static analysis items AllowList once
    allow_list = list(
        scan.repo.allowlistitem_set.filter(
            Q(item_type=AllowListType.CONFIGURATION.value),
            Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
        )
    )

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.CONFIGURATION.value):
        errors.update(plugin)

        if plugin.details:
            for finding in plugin.details:
                id = finding.get("id")
                name = finding.get("name", "")
                description = finding.get("description", "")
                passing = finding.get("pass", False)
                severity = finding.get("severity", "")

                item = {
                    "id": id,
                    "name": name,
                    "description": description,
                    "pass": passing,
                    "severity": severity,
                }

                if severity in filtered_severities and not allowlisted_configuration(item, allow_list):
                    configuration[id] = item

                    if passing != True:
                        summary[severity] += 1

    if plugin is _empty:
        # Loop of configuration plugins never ran so there were no configuration plugin results. In this case the summary
        # should be None to indicate that there were no configuration results instead of that there were configuration results
        # that found no configuration items.
        summary = None

    return PLUGIN_RESULTS(configuration, errors, True, summary)


def allowlisted_configuration(item, allow_list):
    for al_item in allow_list:
        if dict_eq(al_item.value, item, WL_CONFIGURATION_KEYS):

            return True
    return False
