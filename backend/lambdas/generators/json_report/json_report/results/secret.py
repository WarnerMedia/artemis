from dataclasses import dataclass, asdict
from datetime import datetime, timezone

from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import AllowListType, SecretType
from django.db.models import Q

from json_report.results.diff import diff_includes
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.util.util import dict_eq


@dataclass
class SecretFinding:
    type: str
    line: int
    commit: str
    validity: str

    def to_dict(self):
        return asdict(self)


FindingDictType = dict[tuple[str, int, str], SecretFinding]
FilenameDictType = dict[str, FindingDictType]


def get_secrets(scan, params):
    # Unify the output of secrets plugins

    if "secret" not in params:
        secret = SecretType.objects.all().values_list("name", flat=True)
    else:
        secret = params["secret"]

    success = True
    errors = PluginErrors()
    summary = 0

    # Pull the non-expired secrets AllowList once
    allow_list = list(
        scan.repo.allowlistitem_set.filter(
            Q(item_type=AllowListType.SECRET.value),
            Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
        )
    )

    diff_summary = None
    if scan.diff_base and scan.diff_compare and params["filter_diff"]:
        # If the scan was run with a diff set the diff_summary
        diff_summary = scan.diff_summary

    filename_dict: FilenameDictType = {}

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.SECRETS.value):
        if plugin.errors:
            errors.update(plugin)

        for finding in plugin.details:
            if (
                finding.get("type") not in secret
                or allowlisted_secret(finding, allow_list)
                or not diff_includes(finding.get("filename"), finding.get("line"), diff_summary)
            ):
                # Secret type is filtered out or whitelisted or line is not part of diff so skip it
                continue

            success = False  # Reached a non-whitelisted, non-filtered secret

            filename = finding["filename"]
            if filename not in filename_dict:
                filename_dict[filename] = {}
            findings_dict = filename_dict[filename]

            item = SecretFinding(
                type=finding.get("type"),
                line=finding.get("line"),
                commit=finding.get("commit"),
                validity=finding.get("validity", "unknown"),
            )

            key = get_finding_dict_key(item)

            # Add the new finding if it doesn't exist
            # If it already exists, take the higher validity
            if key in findings_dict:
                existing_finding = findings_dict[key]
                highest_validity = get_highest_validity(existing_finding.validity, item.validity)

                existing_finding.validity = highest_validity
            else:
                findings_dict[key] = item
                summary += 1

    secrets = get_secrets_from_filename_dict(filename_dict)

    if plugin is _empty:
        # Loop of secret plugins never ran so there were no secret plugin results. In this case the summary should be
        # None to indicate that there were no secret results instead of that there were secret results that found no
        # secrets.
        summary = None

    return PLUGIN_RESULTS(secrets, errors, success, summary)


def allowlisted_secret(item, allow_list):
    for al in allow_list:
        if dict_eq(al.value, item, ["filename", "line", "commit"]):
            return True
    return False


def get_finding_dict_key(finding: SecretFinding) -> tuple[str, int, str]:
    type = finding.type
    line = finding.line
    commit = finding.commit

    return (type, line, commit)


def get_highest_validity(one: str, two: str) -> str:
    if one == "active" or two == "active":
        return "active"
    elif one == "inactive" or two == "inactive":
        return "inactive"
    else:
        return "unknown"


def get_secrets_from_filename_dict(filename_dict: FilenameDictType) -> dict[str, list[dict]]:
    secrets = {}
    for filename, findings_map in filename_dict.items():
        secrets[filename] = list(finding.to_dict() for finding in findings_map.values())

    return secrets
