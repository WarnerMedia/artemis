from datetime import datetime, timezone

from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import AllowListType, Scan
from django.db.models import Q

from json_report.results.diff import diff_includes
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.util.const import SEVERITY, SEVERITY_DICT
from json_report.util.util import dict_eq


def get_vulns(scan: Scan, params: dict) -> PLUGIN_RESULTS:
    # Unify the output of vulnerability plugins

    if "severity" not in params:
        severity = SEVERITY
    else:
        severity = params["severity"]

    success = True
    vulns = {}
    errors = PluginErrors()

    # Pull the non-expired vulns AllowList once
    allow_list = list(
        scan.repo.allowlistitem_set.filter(
            Q(item_type=AllowListType.VULN.value),
            Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
        )
    )

    # Pull the non-expired vulns_raw AllowList once
    raw_allow_object_list = scan.repo.allowlistitem_set.filter(
        Q(item_type=AllowListType.VULN_RAW.value),
        Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
    )

    # Place all the raw CVEs values into a set for faster searching.
    if raw_allow_object_list:
        raw_allow_list = set(x.value["id"] for x in raw_allow_object_list)
    else:
        raw_allow_list = set()

    diff_summary = None
    if scan.diff_base and scan.diff_compare and params["filter_diff"]:
        # If the scan was run with a diff set the diff_summary and the filtering hasn't been turned off
        diff_summary = scan.diff_summary

    plugin = _empty = object()

    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.VULN.value):
        errors.update(plugin)

        for v in plugin.details:
            if (
                v.get("severity") not in severity
                or allowlisted_vuln(v, allow_list)
                or not diff_includes(v.get("filename"), v.get("line"), diff_summary)
                or v.get("id") in raw_allow_list
            ):
                # Vuln severity is filtered out or whitelisted or line is not part of diff so skip it so skip it
                continue

            success = False  # Reached a non-whitelisted, non-filtered vuln

            if v["component"] not in vulns:
                vulns[v["component"]] = {}

            if v["id"] not in vulns[v["component"]]:
                if isinstance(v.get("source"), list):
                    source = v.get("source")
                else:
                    source = [v.get("source", "")]

                vulns[v["component"]][v["id"]] = {
                    "source": source,
                    "severity": v.get("severity", ""),
                    "description": v.get("description", ""),
                    "remediation": v.get("remediation", ""),
                    "source_plugins": [plugin.plugin_name],
                }
            # if that Component.id is already present, then merge this one with that one, keeping the highest severity.
            else:
                vulns[v["component"]][v["id"]] = _merge_vuln(vulns[v["component"]][v["id"]], v, plugin.plugin_name)

    summary = _get_summary_count(vulns)

    if plugin is _empty:
        # Loop of vuln plugins never ran so there were no vuln plugin results. In this case the summary should be None
        # to indicate that there were no vuln results instead of that there were vuln results that found no vulns.
        summary = None

    return PLUGIN_RESULTS(vulns, errors, success, summary)


def allowlisted_vuln(item, allow_list) -> bool:
    keys = ["component", "id", "source"]
    for al in allow_list:
        if isinstance(item["source"], str):
            # Source is a single string so do a straight comparison
            if dict_eq(al.value, item, keys):
                return True
        elif isinstance(item["source"], list):
            # Source is a list so do a comparison for each item in the list
            masked = []
            for source in item["source"]:
                if dict_eq(al.value, {"component": item["component"], "id": item["id"], "source": source}, keys):
                    masked.append(source)

            # Remove all items from the source list that matched
            for source in masked:
                item["source"].remove(source)

            # If no items remain this item should be hidden
            if not item["source"]:
                return True
    return False


def _get_summary_count(vulns):
    summary = {}

    # build the summary categories
    for severity in SEVERITY + [""]:
        summary[severity] = 0

    for component_str in vulns:
        for id_str in vulns[component_str]:
            this_severity = vulns[component_str][id_str]["severity"]
            summary[this_severity] += 1

    return summary


def _merge_vuln(a, b, plugin_name):
    if "source" in b:
        # veracode_sca has a source list while others have source strings
        if isinstance(b["source"], str):
            a["source"].append(b["source"])
        elif isinstance(b["source"], list):
            a["source"].extend(b["source"])

    if not a["description"]:
        a["description"] = b["description"]
    if not a["remediation"]:
        a["remediation"] = b["remediation"]

    a["severity"] = _most_severe(a["severity"], b["severity"])
    a["source"] = list(set(a["source"]))

    if plugin_name not in a["source_plugins"]:  # Sanity check
        a["source_plugins"].append(plugin_name)

    return a


def _most_severe(severity_a, severity_b):
    temp = SEVERITY_DICT.get(severity_a.upper())
    severity_a_int = temp if isinstance(temp, int) else -1

    temp = SEVERITY_DICT.get(severity_b.upper())
    severity_b_int = temp if isinstance(temp, int) else -1

    most_severe = severity_a if severity_a_int >= severity_b_int else severity_b

    return most_severe
