from datetime import datetime, timezone

from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import AllowListType, Scan
from django.db.models import Q

from json_report.results.diff import diff_includes
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.util.const import SEVERITY, WL_STATIC_ANALYSIS_KEYS
from json_report.util.util import dict_eq


def get_static_analysis(scan: Scan, params: dict) -> PLUGIN_RESULTS:
    """
    Unify the output of static analysis plugins
    NOTE: unit tests are located at api/tests/test_generate_report.py
    Inspect tests for expected output format.
    :param scan: django object of Artemis repo scan
    :param params: Only used for filtering severity
    :return: dictionary of static analysis results, list of errors, boolean success, and boolean truncated output
    """

    if "severity" not in params:
        severity = SEVERITY
    else:
        severity = params["severity"]

    success = True
    static_analysis = {}
    summary = {}
    # Set up summary structure
    for sev in SEVERITY + [""]:
        summary[sev] = 0
    errors = PluginErrors()

    # Pull the non-expired static analysis items AllowList once
    allow_list = list(
        scan.repo.allowlistitem_set.filter(
            Q(item_type=AllowListType.STATIC_ANALYSIS.value),
            Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
        )
    )

    diff_summary = None
    if scan.diff_base and scan.diff_compare and params["filter_diff"]:
        # If the scan was run with a diff set the diff_summary
        diff_summary = scan.diff_summary

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.STATIC_ANALYSIS.value):
        errors.update(plugin)

        if not plugin.details:
            continue

        success = False

        for detail in plugin.details:
            # Build the item from the detail so it can be run through the AllowList
            item = {
                "filename": detail.get("filename", ""),
                "line": detail.get("line", ""),
                "type": detail.get("type", ""),
                "message": detail.get("message", ""),
                "severity": detail.get("severity", ""),
            }

            if (
                item.get("severity") not in severity
                or allowlisted_static_analysis(item, allow_list)
                or not diff_includes(item.get("filename"), item.get("line"), diff_summary)
            ):
                # Static analysis item severity is filtered or item is allowlisted or not included in diff so skip it
                continue

            # Remove the filename from the item because it's not needed anymore
            del item["filename"]

            if detail["filename"] not in static_analysis:
                static_analysis[detail["filename"]] = []

            if item not in static_analysis[detail["filename"]]:
                static_analysis[detail["filename"]].append(item)

            summary[detail.get("severity", "")] += 1

    if plugin is _empty:
        # Loop of static analysis plugins never ran so there were no static analysis plugin results. In this case the
        # summary should be None to indicate that there were no secret results instead of that there were static
        # analysis results that found no static analysis issues.
        summary = None

    return PLUGIN_RESULTS(static_analysis, errors, success, summary)


def allowlisted_static_analysis(item, allow_list):
    for al in allow_list:
        if dict_eq(al.value, item, WL_STATIC_ANALYSIS_KEYS):
            return True
    return False
