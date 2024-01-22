"""
Constants file
todo : search plugin settings.json to obtain a dynamic list of plugins and categories.
"""
# pylint: disable=no-member
import os
from collections import namedtuple

from repo.util.env import AQUA_ENABLED, SNYK_ENABLED, VERACODE_ENABLED, GHAS_ENABLED

DB_TTL_DAYS = 60
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 250
MAX_DIFF_BASE = 256

# Category/plugin dictionary structure:
# {
#     "CATEGORY_NAME" {
#         "PLUGIN_NAME": "FEATURE_FLAG" or None
#     }
# }
PLUGIN_LIST_BY_CATEGORY = {
    "vulnerability": {
        "node_dependencies": None,
        "owasp_dependency_check": None,
        "php_sensio_security_checker": None,
        "bundler_audit": None,
        "trivy_image": None,
        "trivy_sca": None,
    },
    "secret": {"gitsecrets": None, "truffle_hog": None},
    "static_analysis": {
        "brakeman": None,
        "cfn_python_lint": None,
        "detekt": None,
        "findsecbugs_java7": None,
        "findsecbugs_java8": None,
        "findsecbugs_java13": None,
        "python_code_checker": None,
        "shell_check": None,
        "eslint": None,
        "tflint": None,
        "nodejsscan": None,
        "bandit": None,
        "gosec": None,
        "swiftlint": None,
        "checkov": None,
    },
    "inventory": {"technology_discovery": None, "base_images": None},
    "configuration": {"github_repo_health": None},
    "sbom": {},
}

# These are disabled unless explicitly enabled in the request
DEFAULT_DISABLED_CATEGORIES = ["sbom"]

# The qualified plugins structure is a dictionary of the plugin categories. Within each
# category is a list of lists of plugins. Each index of the list must be matched but within
# the sub-list only one of the plugins needs to match (i.e. the sub-lists are boolean ORs
# while the top lists are boolean ANDs).
#
# Example:
# {
#   "category1": [
#     ["plugin1"],
#     ["plugin2", "plugin3"]
#   ]
# }
#
# In the above example the scan qualifies if plugin1 AND (plugin2 OR plugin3) are enabled
QUALIFIED_OPTIONAL_PLUGINS = {"nodejsscan", "technology_discovery", "base_images"}  # Not required for qualification
QUALIFIED_PLUGINS = {
    "vulnerability": [
        [k] for k in set(PLUGIN_LIST_BY_CATEGORY["vulnerability"].keys()).difference(QUALIFIED_OPTIONAL_PLUGINS)
    ],
    "static_analysis": [
        [k] for k in set(PLUGIN_LIST_BY_CATEGORY["static_analysis"].keys()).difference(QUALIFIED_OPTIONAL_PLUGINS)
    ],
    "inventory": [[k] for k in set(PLUGIN_LIST_BY_CATEGORY["inventory"].keys()).difference(QUALIFIED_OPTIONAL_PLUGINS)],
    "configuration": [
        [k] for k in set(PLUGIN_LIST_BY_CATEGORY["configuration"].keys()).difference(QUALIFIED_OPTIONAL_PLUGINS)
    ],
    "sbom": [[k] for k in set(PLUGIN_LIST_BY_CATEGORY["sbom"].keys()).difference(QUALIFIED_OPTIONAL_PLUGINS)],
}

# This is a list of plugins that have been disabled in this deployment. They will still be allowed
# to be specified in a scan request as a disabled plugin and not throw an error. Specifying them as
# an explicitly enabled plugin will return an error but a different error than if a completely unknown
# plugin name were to be included in the request.
DISABLED_PLUGINS = []

# Add in plugins that can be disabled per-environment and are enabled in this environment
if AQUA_ENABLED:
    # Add the Aqua plugin if it is enabled
    PLUGIN_LIST_BY_CATEGORY["vulnerability"]["aqua_cli_scanner"] = None
    for i in QUALIFIED_PLUGINS["vulnerability"]:
        if i == ["trivy_image" or "trivy_sca" ]:
            # Set aqua_cli_scanner as an alternate option to trivy for qualification
            i.append("aqua_cli_scanner")
else:
    DISABLED_PLUGINS.append("aqua_cli_scanner")

if SNYK_ENABLED:
    # Add the Snyk plugin if it is enabled
    PLUGIN_LIST_BY_CATEGORY["vulnerability"]["snyk"] = "snyk"  # Still feature-flagged
    QUALIFIED_PLUGINS["sbom"].append(["snyk"])
else:
    DISABLED_PLUGINS.append("snyk")

if SNYK_ENABLED:
    # Add the Snyk plugin if it is enabled
    PLUGIN_LIST_BY_CATEGORY["vulnerability"]["snyk"] = "snyk"  # Still feature-flagged
    QUALIFIED_PLUGINS["sbom"].append(["snyk"])
else:
    DISABLED_PLUGINS.append("snyk")

if VERACODE_ENABLED:
    # Add the Veracode plugin if it is enabled
    PLUGIN_LIST_BY_CATEGORY["vulnerability"]["veracode_sca"] = None
    PLUGIN_LIST_BY_CATEGORY["sbom"]["veracode_sbom"] = None
    for i in QUALIFIED_PLUGINS["vulnerability"]:
        if i == ["snyk"]:
            # Set veracode_sca as an alterate option to snyk for qualification
            i.append("veracode_sca")
else:
    DISABLED_PLUGINS.append("veracode_sca")
    DISABLED_PLUGINS.append("veracode_sbom")

if GHAS_ENABLED:
    # Add the GitHub Advanced Security plugin if it enabled
    PLUGIN_LIST_BY_CATEGORY["secret"]["ghas_secrets"] = None
else:
    DISABLED_PLUGINS.append("ghas_secrets")

PLUGINS = []
for plugin_cat in PLUGIN_LIST_BY_CATEGORY:
    PLUGINS.extend(PLUGIN_LIST_BY_CATEGORY.get(plugin_cat).keys())

PLUGIN_CATEGORIES = list(PLUGIN_LIST_BY_CATEGORY.keys())

# Report formats
FORMAT_FULL = "full"
FORMAT_SUMMARY = "summary"
FORMAT_SBOM = "sbom"

HISTORY_QUERY_PARAMS = ["limit", "offset", "initiated_by", "include_batch", "include_diff", "qualified"]
QUERY_PARAMS = ["results", "severity", "secret", "type", "format", "filter_diff"]
RESULTS = ["vulnerabilities", "secrets", "static_analysis", "inventory", "configuration"]
SEVERITY = ["critical", "high", "medium", "low", "negligible", ""]
FORMAT = [FORMAT_FULL, FORMAT_SUMMARY, FORMAT_SBOM]
RESOURCES = ["whitelist", "history", "report"]
WL_TYPES = ["vulnerability", "vulnerability_raw", "secret", "secret_raw", "static_analysis", "configuration"]
WL_REQUIRED_KEYS = ["type", "value", "reason"]
WL_IGNORED_KEYS = ["created", "updated", "updated_by"]
WL_ALL_KEYS = WL_REQUIRED_KEYS + WL_IGNORED_KEYS + ["expires"]
WL_VULN_KEYS = {"component": str, "id": str, "source": str}
WL_VULN_OPT_KEYS = {"severity": str}
WL_VULN_RAW_KEYS = {"id": str}
WL_VULN_RAW_OPT_KEYS = {"severity": str}
WL_SECRET_KEYS = {"filename": str, "line": int, "commit": str}
WL_SECRET_OPT_KEYS = {}
WL_SECRET_RAW_KEYS = {"value": str}
WL_SECRET_RAW_OPT_KEYS = {}
WL_STATIC_ANALYSIS_KEYS = {"filename": str, "line": int, "type": str}
WL_STATIC_ANALYSIS_OPT_KEYS = {"severity": str}
WL_CONFIGURATION_KEYS = {"id": str}
WL_CONFIGURATION_OPT_KEYS = {"severity": str}
REPORT_REQUIRED_KEYS = []
REPORT_ALL_KEYS = REPORT_REQUIRED_KEYS + ["type", "filters"]
DEFAULT_REPORT_TYPE = "pdf"
REPORT_TYPES = [DEFAULT_REPORT_TYPE]
SCAN_PARAMS = [
    "repo",
    "org",
    "plugins",
    "depth",
    "branch",
    "include_dev",
    "callback",
    "batch_priority",
    "categories",
    "diff_base",
    "schedule_run",
    "batch_id",
    "include_paths",
    "exclude_paths",
]

GITLAB_QUERY_WITH_BRANCH = """
repo$count{ project(fullPath: "$org_name/$repo") {
    httpUrlToRepo,
    fullPath,
    visibility,
    statistics {
        repositorySize
    }
    repository {
        tree(ref: "$branch") {
            lastCommit {
                id
            }
        }
    }
}}
"""

GITLAB_QUERY_NO_BRANCH = """
repo$count{ project(fullPath: "$org_name/$repo") {
    httpUrlToRepo,
    fullPath,
    visibility,
    statistics {
        repositorySize
    }
}}
"""

BITBUCKET_PUBLIC_REPO_QUERY = "$service_url/repositories/$org/$repo"

BITBUCKET_PRIVATE_REPO_QUERY = "$service_url/projects/$org/repos/$repo"

BITBUCKET_PUBLIC_BRANCH_QUERY = "$service_url/repositories/$org/$repo/refs/branches/$branch"

BITBUCKET_PRIVATE_BRANCH_QUERY = "$service_url/projects/$org/repos/$repo/branches"

PROCESS_RESPONSE_TUPLE = namedtuple("process_response_tuple", ["queued", "failed", "unauthorized"])

SERVICES_S3_KEY = "services.json"

ROOT_DIR = os.path.dirname(os.path.abspath(os.path.join(__file__, "..", "..", "..", "..")))
INVALID_REF_CHARS = [" ", "\\", "~", "^", ":", "?", "*", "["]

DEFAULT_SCAN_QUERY_PARAMS = {"format": FORMAT_FULL, "filter_diff": True}

DEFAULT_S3_DL_EXPIRATION_SECONDS = 3600  # 1 hour
REPORT_S3_DL_EXPIRATION_SECONDS = 300  # 5 Minutes

SCOPE_CACHE_EXPIRATION_MINUTES = 60

MAX_PATH_LENGTH = 4096
