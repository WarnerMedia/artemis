from datetime import datetime, timezone

from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import AllowListType
from django.db.models import Q

from json_report.results.diff import diff_includes
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.util.const import SECRET
from json_report.util.util import dict_eq


def get_secrets(scan, params):
    # Unify the output of secrets plugins

    if "secret" not in params:
        secret = SECRET
        # TODO: Fix this stopgap measure so that the list of secret types is dynamic based on plugin results
        #
        # The ghas_secrets plugin introduced a large number of new secret types. The list of types will expand
        # as GitHub adds additional detections:
        # https://docs.github.com/en/code-security/secret-scanning/secret-scanning-patterns
        #
        # Secret filtering via the API assumes the type is one of a small number of static types. This was causing
        # the new secrets from the ghas_secrets plugin to get filtered out of the results because they didn't
        # match the expected types. As a workaround, this boolean is used to bypass the type filtering when no
        # types are specified.
        #
        # A better solution would be to store a list of secret types in the database and update it based on the
        # results of plugins so that when new detections are added the list is updated automatically.
        all_secrets = True
    else:
        secret = params["secret"]
        all_secrets = False

    success = True
    secrets = {}
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

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.SECRETS.value):
        if plugin.errors:
            errors.update(plugin)

        for s in plugin.details:
            if (
                (
                    not all_secrets and s.get("type") not in secret
                )  # TODO: Fix this stopgap measure so that the list of secret types is dynamic base on plugin results
                or allowlisted_secret(s, allow_list)
                or not diff_includes(s.get("filename"), s.get("line"), diff_summary)
            ):
                # Secret type is filtered out or whitelisted or line is not part of diff so skip it
                continue

            success = False  # Reached a non-whitelisted, non-filtered secret

            # Build the full secrets results
            if s["filename"] not in secrets:
                secrets[s["filename"]] = []
            item = {"type": s.get("type"), "line": s.get("line"), "commit": s.get("commit")}
            if item not in secrets[s["filename"]]:
                secrets[s["filename"]].append(item)

            # Update the summary count
            summary += 1

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
