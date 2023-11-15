from artemisdb.artemisdb.consts import PluginType
from artemisdb.artemisdb.models import Scan
from json_report.results.results import PLUGIN_RESULTS, PluginErrors


def get_sbom(scan: Scan) -> PLUGIN_RESULTS:
    """
    Unify the output of sbom plugins. We deliberately omit the `details` property in the database
    (since SBOM results are stored in s3), so this returns no scan results or summary
    NOTE: unit tests are located at api/tests/test_generate_report.py
    Inspect tests for expected output format.
    :param scan: django object of Artemis repo scan
    :return: dictionary of None for findings, list of errors, boolean success, and None for summary
    """

    errors = PluginErrors()

    plugin = _empty = object()
    for plugin in scan.pluginresult_set.filter(plugin_type=PluginType.SBOM.value):
        errors.update(plugin)

    return PLUGIN_RESULTS(None, errors, True, None)
