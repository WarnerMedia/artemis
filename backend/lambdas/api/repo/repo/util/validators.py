# pylint: disable=no-member
from datetime import datetime, timezone
from fnmatch import fnmatch
from uuid import UUID

from artemisapi.validators import ValidationError
from artemisdb.artemisdb.consts import MAX_REASON_LENGTH
from artemisdb.artemisdb.models import ScanBatch, ScanScheduleRun, SecretType
from repo.util.const import (
    DEFAULT_REPORT_TYPE,
    DEFAULT_SCAN_QUERY_PARAMS,
    DISABLED_PLUGINS,
    FORMAT,
    FORMAT_FULL,
    HISTORY_QUERY_PARAMS,
    INVALID_REF_CHARS,
    MAX_DIFF_BASE,
    MAX_PAGE_SIZE,
    MAX_PATH_LENGTH,
    PLUGIN_CATEGORIES,
    PLUGINS,
    QUERY_PARAMS,
    REPORT_ALL_KEYS,
    REPORT_REQUIRED_KEYS,
    REPORT_TYPES,
    RESOURCES,
    RESULTS,
    SCAN_PARAMS,
    SEVERITY,
    WL_ALL_KEYS,
    WL_CONFIGURATION_KEYS,
    WL_CONFIGURATION_OPT_KEYS,
    WL_REQUIRED_KEYS,
    WL_SECRET_KEYS,
    WL_SECRET_OPT_KEYS,
    WL_SECRET_RAW_KEYS,
    WL_SECRET_RAW_OPT_KEYS,
    WL_STATIC_ANALYSIS_KEYS,
    WL_STATIC_ANALYSIS_OPT_KEYS,
    WL_TYPES,
    WL_VULN_KEYS,
    WL_VULN_OPT_KEYS,
    WL_VULN_RAW_KEYS,
    WL_VULN_RAW_OPT_KEYS,
)
from repo.util.env import DEFAULT_BATCH_PRIORITY, DEFAULT_DEPTH, DEFAULT_INCLUDE_DEV
from artemislib.logging import Logger

log = Logger(__name__)


class Validator:
    def __init__(self, services, repos, scheduler: bool = False):
        self.services = services
        self.repos = repos
        self.scheduler = scheduler

    def validate_request_body(self, ret, service_id, item_validator):
        for item in ret:
            item_validator(item, service_id)

    def _validate_request_service(self, event):
        service_id = event.get("service_id")
        if not service_id or service_id not in self.services:
            error = f"Unsupported service: {service_id}"
            log.error(error)
            raise ValidationError(error)

    def validate_request_repo(self, event):
        service_id = event.get("service_id")
        self._validate_request_service(event)

        repo_id = event.get("repo_id")
        if not repo_id:
            return

        self._validate_service_repo(service_id, repo_id)

    def _validate_service_repo(self, service_id, repo_id) -> None or ValidationError:
        """
        Checks if the repo is valid to scan.
        If the service_id matches a service that has the field "allow_all" set to True, the service is privately owned
        and all repos are valid.
        if the service is public, the service/repo combination will be checked against a list of allowed repos.
        If there is a match, the function returns
        If not, a ValidationError will be thrown
        """
        if self.services.get(service_id).get("allow_all"):
            return

        for pattern in self.repos:
            if fnmatch(f"{service_id}/{repo_id}", pattern):
                return
        error = f"Unsupported repo: {service_id}/{repo_id}"
        log.error(error)
        raise ValidationError(error)

    def validate_request_resource(self, event):
        resource = event.get("resource")
        if not resource:
            return

        if resource not in RESOURCES:
            error = "Invalid resource"
            log.error(error)
            raise ValidationError(error)

    def validate_request_history_query(self, event):
        params = event.get("query_params")
        if not params:
            return

        allowed_keys = HISTORY_QUERY_PARAMS
        for key in params.keys():
            if key not in allowed_keys:
                raise ValidationError(f"Invalid query parameter found: {key}")

        if "page_size" in params:
            try:
                page_size = params["page_size"]
                if len(page_size) != 1:
                    raise ValidationError("page_size must contain only one value.")
                page_size = int(params["page_size"][0])
            except ValueError:
                raise ValidationError("Page size must be an integer.")
            if page_size > MAX_PAGE_SIZE:
                raise ValidationError(f"Page sizes greater than {MAX_PAGE_SIZE} are not allowed.")
            if page_size < 1:
                raise ValidationError("Page sizes must be greater than 0.")

        if "last_scan_id" in params:
            last_scan_id = params["last_scan_id"]
            if len(last_scan_id) != 1:
                raise ValidationError("last_scan_id must contain only one value.")
            last_scan_id = last_scan_id[0]
            try:
                UUID(last_scan_id)
            except ValueError:
                raise ValidationError(f"{last_scan_id} is not a valid scan id.")

        self._validate_bool(params, "include_batch")
        self._validate_bool(params, "include_diff")
        self._validate_bool(params, "qualified")

    def _validate_bool(self, params: dict, key: str):
        if key not in params:
            return

        if params[key] == [""]:
            params[key] = True
        else:
            if len(params[key]) != 1:
                raise ValidationError(f"{key} can only be specified once")
            if params[key][0].lower() not in ("true", "false"):
                raise ValidationError(f"{key} must be a boolean")
            params[key] = params[key][0].lower() == "true"

    def validate_request_query(self, event):
        params = event.get("query_params")
        if not params:
            # Set the default format and filtering if no parameters are passed in
            event["query_params"] = DEFAULT_SCAN_QUERY_PARAMS
            return

        self._validate_params(params.keys(), QUERY_PARAMS, "Invalid query parameter")

        if "results" in params:
            self._validate_params(params["results"], RESULTS, "Invalid results type in query")

        if "severity" in params:
            self._validate_params(params["severity"], SEVERITY, "Invalid severity type in query")

        if "secret" in params:
            self._validate_params(
                params["secret"],
                SecretType.objects.all().values_list("name", flat=True),
                "Invalid secret type in query",
            )

        if "format" in params:
            self._validate_params(params["format"], FORMAT, "Invalid format type in query")
            if len(params["format"]) != 1:
                raise ValidationError("Format can only be specified once")
            event["query_params"]["format"] = params["format"][0]  # Collapse the list into a single value
        else:
            # Set the default format if there are parameters but format is not one of them
            event["query_params"]["format"] = FORMAT_FULL

        if "filter_diff" in params:
            if params["filter_diff"] == [""]:
                params["filter_diff"] = True
            else:
                if len(params["filter_diff"]) != 1:
                    raise ValidationError("filter_diff can only be specified once")
                if not isinstance(params["filter_diff"][0], str) or params["filter_diff"][0].lower() not in (
                    "true",
                    "false",
                ):
                    raise ValidationError("filter_diff must be a boolean")
                event["query_params"]["filter_diff"] = params["filter_diff"][0].lower() == "true"
        else:
            event["query_params"]["filter_diff"] = True

    def _validate_params(self, items, validation_list, error_message):
        validation_set = set(validation_list)
        for item in items:
            if item not in validation_set:
                log.error(error_message)
                raise ValidationError(error_message)

    def _validate_request_item_with_repo(self, req, service):
        if "repo" not in req:
            raise ValidationError('Missing key: "repo"')
        self._validate_request_item(req, service)

    def _validate_request_item_no_repo(self, req, service):
        if "repo" in req:
            raise ValidationError('"repo" key not supported')
        if "org" in req:
            raise ValidationError('"org" key not supported')
        self._validate_request_item(req, service)

    def _validate_request_item(self, req, service):
        org_name = req.get("org")
        repo_name = req.get("repo_id")

        if org_name and repo_name:
            self._validate_service_repo(service, f"{org_name}/{repo_name}")

        plugins = req.get("plugins", [])
        if not isinstance(plugins, list):
            raise ValidationError("plugins must be a list")
        # Remove any negated, disabled plugins from the list so they are ignored and not stored in the scan record
        for plugin in DISABLED_PLUGINS:
            if f"-{plugin}" in plugins:
                plugins.remove(f"-{plugin}")
        # Validate the remaining plugins
        for plugin in plugins:
            if not isinstance(plugin, str):
                raise ValidationError("plugins must be a list of strings")

            if plugin in DISABLED_PLUGINS:
                # Plugin is supported but disabled in this deployment. Return a validation error indicating as such.
                raise ValidationError(f"Plugin {plugin} is disabled")

            # Check both plugin inclusion ("plugin_name") and exclusion ("-plugin_name")
            if (not plugin.startswith("-") and plugin.lower() not in PLUGINS) or (
                plugin.startswith("-") and plugin.lower()[1:] not in PLUGINS
            ):
                raise ValidationError("Unsupported plugin: %s" % plugin)

        depth = req.get("depth", DEFAULT_DEPTH)
        if not (depth is None or (isinstance(depth, int) and depth > 0)):
            raise ValidationError("depth must be a positive integer or null")

        include_dev = req.get("include_dev", DEFAULT_INCLUDE_DEV)
        if not isinstance(include_dev, bool):
            raise ValidationError("include_dev must be a boolean")

        batch_priority = req.get("batch_priority", DEFAULT_BATCH_PRIORITY)
        if not isinstance(batch_priority, bool):
            raise ValidationError("batch_priority must be a boolean")

        self._validate_diff_base(req.get("diff_base"))

        categories = req.get("categories", [])
        if not isinstance(plugins, list):
            raise ValidationError("categories must be a list")
        for category in categories:
            if not isinstance(category, str):
                raise ValidationError("categories must be a list of strings")
            self.validate_category(category, PLUGIN_CATEGORIES)

        self._validate_request_item_callback(req)

        schedule_run = req.get("schedule_run")
        if schedule_run is not None:
            if not self.scheduler:
                raise ValidationError("Scheduled scanning is not permitted")
            elif not ScanScheduleRun.objects.filter(run_id=schedule_run).exists():
                raise ValidationError(f"{schedule_run} is not a valid schedule run ID.")

        batch_id = req.get("batch_id")
        if batch_id is not None and not ScanBatch.objects.filter(batch_id=batch_id).exists():
            raise ValidationError(f"batch {batch_id} does not exist")

        include_paths = req.get("include_paths", [])
        self._validate_paths(include_paths, "include_paths")

        exclude_paths = req.get("exclude_paths", [])
        self._validate_paths(exclude_paths, "exclude_paths")

        if include_paths and not exclude_paths:
            # If include paths are set without any exclude paths the exclude path defaults to everything.
            # The effect of this is that you can use include_paths alone to target specific paths.
            req["exclude_paths"] = ["*"]

        for key in req:
            if key not in SCAN_PARAMS:
                raise ValidationError("Unknown parameter: %s" % key)

    def _validate_request_item_callback(self, req):
        callback = req.get("callback", {})
        if not isinstance(callback, dict):
            raise ValidationError("callback must be a dict")
        for key in callback:
            if key not in ("url", "client_id"):
                raise ValidationError("Unknown callback parameter: %s" % key)
        if not isinstance(callback.get("url", ""), str):
            raise ValidationError("callback url must be a string")
        if not isinstance(callback.get("client_id", ""), str):
            raise ValidationError("callback client_id must be a string")

    def _validate_whitelist_item(self, req, _):
        """
        Warning: req may be modified.
        """
        for key in WL_REQUIRED_KEYS:
            if key not in req:
                raise ValidationError(f'Missing key: "{key}"')
        for key in req:
            if key not in WL_ALL_KEYS:
                raise ValidationError(f'Unexpected key: "{key}"')

        if req["type"] not in WL_TYPES:
            raise ValidationError(f'Invalid type: "{req["type"]}"')

        if req["type"] == "vulnerability":
            keys = WL_VULN_KEYS
            opt_keys = WL_VULN_OPT_KEYS
        elif req["type"] == "vulnerability_raw":
            keys = WL_VULN_RAW_KEYS
            opt_keys = WL_VULN_RAW_OPT_KEYS
        elif req["type"] == "secret":
            keys = WL_SECRET_KEYS
            opt_keys = WL_SECRET_OPT_KEYS
        elif req["type"] == "secret_raw":
            keys = WL_SECRET_RAW_KEYS
            opt_keys = WL_SECRET_RAW_OPT_KEYS
        elif req["type"] == "static_analysis":
            keys = WL_STATIC_ANALYSIS_KEYS
            opt_keys = WL_STATIC_ANALYSIS_OPT_KEYS
        elif req["type"] == "configuration":
            keys = WL_CONFIGURATION_KEYS
            opt_keys = WL_CONFIGURATION_OPT_KEYS
        else:
            keys = {}
            opt_keys = {}

        for key in keys:
            if key not in req["value"]:
                raise ValidationError(f'Missing value key: "{key}"')
        for key in req["value"]:
            if key not in keys and key not in opt_keys:
                raise ValidationError(f'Unexpected value key: "{key}"')
            if not isinstance(req["value"][key], keys.get(key) or opt_keys.get(key)):
                raise ValidationError(f'Value key "{key}" is not of type {keys.get(key) or opt_keys.get(key)}')

        if not isinstance(req["value"].get("line", 0), int):
            raise ValidationError("Line must be an integer")

        # Check that expires, if present, is a valid timestamp
        if req.get("expires"):
            try:
                if isinstance(req["expires"], str) and req["expires"].endswith("Z"):
                    # Python can't handle parsing Zulu Time so replace it with the UTC offset instead
                    req["expires"] = req["expires"].replace("Z", "+00:00")
                req["expires"] = datetime.fromisoformat(req["expires"]).astimezone(tz=timezone.utc)
            except (ValueError, TypeError):
                raise ValidationError("Invalid expires value")
        else:
            req["expires"] = None

        # Check that reason is a string
        if not isinstance(req["reason"], str):
            raise ValidationError("Reason must be a string")

        # Check that reason does not exceed the minimum or maximum length
        if not 0 < len(req["reason"]) <= MAX_REASON_LENGTH:
            raise ValidationError(f"Reason must be between 1 and {MAX_REASON_LENGTH} characters")

    def validate_category(self, category: str, category_list) -> None:
        # Get the category name, accounting for negation
        category_name = category[1:] if category.startswith("-") else category

        # Check if the category name is in the list of categories
        if category_name.lower() not in category_list:
            raise ValidationError(f"Invalid category type: {category_name}")

    def _validate_diff_base(self, diff_base: str) -> None:
        """
        Validate that the diff_base value is a non-empty string that does
        not exceed MAX_DIFF_BASE or contain any invalid characters.
        """
        if diff_base is None:
            # None is an allowed value
            return

        # Make sure diff_base is a non-empty string no longer than MAX_DIFF_BASE
        if not isinstance(diff_base, str):
            raise ValidationError("diff_base must be a string")
        elif not diff_base:
            raise ValidationError("diff_base must not be an empty string")
        elif len(diff_base) > MAX_DIFF_BASE:
            raise ValidationError(f"diff_base cannot exceed {MAX_DIFF_BASE} characters")

        # Make sure diff_base does not contain any invalid characters
        for ic in INVALID_REF_CHARS:
            if ic in diff_base:
                raise ValidationError(f"diff_base contains invalid character: {ic}")

    def validate_request_report(self, event):
        if event.get("query_params"):
            raise ValidationError("report does not take query parameters")

        if not event["scan_id"]:
            raise ValidationError("scan ID is required")

        if event["resource_id"]:
            try:
                UUID(event["resource_id"])
            except ValueError:
                raise ValidationError(f"{event['resource_id']} is not a valid report id.")

    def _validate_report_item(self, req, _):
        if req is None:
            req = {}

        for key in REPORT_REQUIRED_KEYS:
            if key not in req:
                raise ValidationError(f'Missing key: "{key}"')
        for key in req:
            if key not in REPORT_ALL_KEYS:
                raise ValidationError(f'Unexpected key: "{key}"')

        if not req.get("type"):
            req["type"] = DEFAULT_REPORT_TYPE
        else:
            if req["type"] not in REPORT_TYPES:
                raise ValidationError(f'Invalid type: "{req["type"]}"')

        if not req.get("filters"):
            # Set the default format and filtering if no filters are passed in
            req["filters"] = DEFAULT_SCAN_QUERY_PARAMS
        else:
            # Validate the filters, which are in the same structure as the query params when getting a normal scan
            self.validate_request_query({"query_params": req["filters"]})

    def _validate_paths(self, paths, param_name) -> None:
        if not isinstance(paths, list):
            raise ValidationError(f"{param_name} must be a list")

        for path in paths:
            if not isinstance(path, str):
                raise ValidationError(f"{param_name} must be a list of strings")

            if ".." in path or "\0" in path or "$" in path or path.startswith("./") or path.startswith("/"):
                raise ValidationError(f"{param_name} path is invalid: {path}")

            if len(path) > MAX_PATH_LENGTH:
                raise ValidationError(f"{param_name} path exceeds max length ({MAX_PATH_LENGTH})")
