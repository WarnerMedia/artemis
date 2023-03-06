from artemisdb.artemisdb.models import Scan
from json_report.results.configuration import get_configuration
from json_report.results.inventory import get_inventory
from json_report.results.results import PLUGIN_RESULTS, PluginErrors
from json_report.results.secret import get_secrets
from json_report.results.static_analysis import get_static_analysis
from json_report.results.vuln import get_vulns
from json_report.util.const import FORMAT_FULL


def get_report(scan_id, params=None):
    try:
        scan = Scan.objects.get(scan_id=scan_id)
    except Scan.DoesNotExist:
        return None

    vuln_results = PLUGIN_RESULTS({}, PluginErrors(), True, None)
    secret_results = PLUGIN_RESULTS({}, PluginErrors(), True, None)
    sa_results = PLUGIN_RESULTS({}, PluginErrors(), True, None)
    inv_results = PLUGIN_RESULTS({}, PluginErrors(), True, None)
    config_results = PLUGIN_RESULTS({}, PluginErrors(), True, None)

    # Initialize the errors
    errors = PluginErrors()
    errors.update(scan, name_override="Setup")

    #    There are two use cases
    # 1. the user did not specify any "results" thus there is no 'results' key,
    #    so we want to generate reports for all three plugin categories.
    # 2. the user specified "results", giving params a "results" key with a list of values.
    #    We now want to see if each plugin category is one of the values.
    if "results" not in params or "vulnerabilities" in params["results"]:
        vuln_results = get_vulns(scan, params)

    if "results" not in params or "secrets" in params["results"]:
        secret_results = get_secrets(scan, params)

    if "results" not in params or "static_analysis" in params["results"]:
        sa_results = get_static_analysis(scan, params)

    if "results" not in params or "inventory" in params["results"]:
        inv_results = get_inventory(scan)

    if "results" not in params or "configuration" in params["results"]:
        config_results = get_configuration(scan, params)

    errors.update(vuln_results.errors)
    errors.update(secret_results.errors)
    errors.update(sa_results.errors)
    errors.update(inv_results.errors)
    errors.update(config_results.errors)

    success = (
        vuln_results.success
        and secret_results.success
        and sa_results.success
        and inv_results.success
        and config_results.success
    )

    report = scan.to_dict()
    report["application_metadata"] = scan.formatted_application_metadata()
    report["success"] = success
    report["truncated"] = False  # Legacy field, static value
    report["errors"] = errors.errors
    report["alerts"] = errors.alerts
    report["debug"] = errors.debug
    report["results_summary"] = {
        "vulnerabilities": vuln_results.summary,
        "secrets": secret_results.summary,
        "static_analysis": sa_results.summary,
        "inventory": inv_results.summary,
        "configuration": config_results.summary,
    }

    if params["format"] == FORMAT_FULL:
        report["results"] = {
            "vulnerabilities": vuln_results.findings,
            "secrets": secret_results.findings,
            "static_analysis": sa_results.findings,
            "inventory": inv_results.findings,
            "configuration": config_results.findings,
        }
    else:
        report["results"] = {}

    return report
