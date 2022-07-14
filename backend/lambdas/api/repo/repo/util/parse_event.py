import copy
import json
import uuid

from artemisapi.validators import ValidationError
from repo.util.const import DEFAULT_DISABLED_CATEGORIES, PLUGIN_LIST_BY_CATEGORY, RESOURCES, SERVICES_S3_KEY
from repo.util.services import get_services_dict
from repo.util.validators import Validator


class EventParser:
    def __init__(self, event, services_loc=SERVICES_S3_KEY, identity=None):
        services_dict = get_services_dict(services_loc)
        self.services = services_dict.get("services")
        self.repos = services_dict.get("repos")
        self.event = event
        self.validator = Validator(self.services, self.repos, identity.scheduler if identity else False)
        self.identity = identity

        self.parsed_event = None

    def parse_event(self):
        ret = {
            "service_id": None,
            "repo_id": None,
            "scan_id": None,
            "resource": None,
            "resource_id": None,
            "query_params": self.event.get("multiValueQueryStringParameters", {}),
            "body": self.event.get("body"),
            "source_ip": self.event["requestContext"]["identity"]["sourceIp"],
        }

        if ret["query_params"] is None:
            ret["query_params"] = {}

        params = self.event.get("pathParameters") or {}

        ids = self._parse_id(params.get("id"))
        ret["service_id"] = ids["service_id"]
        ret["repo_id"] = ids["repo_id"]
        ret["scan_id"] = ids["scan_id"]
        ret["resource"] = ids["resource"]
        ret["resource_id"] = ids["resource_id"]

        self.validator.validate_request_repo(ret)
        self.validator.validate_request_resource(ret)
        if ret["resource"] == "history":
            self.validator.validate_request_history_query(ret)
        elif ret["resource"] == "report":
            self.validator.validate_request_report(ret)
        else:
            self.validator.validate_request_query(ret)

        self.parsed_event = ret

    def _parse_id(self, raw_id):
        """
        Parsing the raw_id to get service and repo information
        """
        print(f"Parsing ID: {raw_id}")

        ret = {"service_id": None, "repo_id": None, "scan_id": None, "resource": None, "resource_id": None}

        if not raw_id:
            return ret

        raw_id = raw_id.lower()
        split = raw_id.split("/")

        ret["service_id"] = split[0]
        if split[0] == "repo":
            # repo is an alias for github, for compatibility purposes
            ret["service_id"] = "github"
        del split[0]

        # If the end of the path is a resource name
        if split and split[-1] in RESOURCES:
            ret["resource"] = split[-1]
            del split[-1]
        # If the end of the path is a resource name and ID
        elif len(split) > 2 and split[-2] in RESOURCES:
            ret["resource"] = split[-2]
            ret["resource_id"] = split[-1]
            del split[-2:]

        if len(split) > 2:
            try:
                # See if the last part is a valid UUID. If so it's a scan ID.
                ret["scan_id"] = str(uuid.UUID(split[-1]))
                del split[-1]
            except ValueError:
                pass

        if split:
            # The repo is whatever is left
            ret["repo_id"] = "/".join(split)
        return ret

    def get_req_list(self):
        if self.parsed_event["repo_id"]:
            # The post was to /SERVICE/ORG/REPO, so we'll use the repo in the
            # path so it should not be in the body
            req_list = self._parse_repo_body(repo_in_path=True)

            req_list[0]["org"] = self.parsed_event["repo_id"].split("/")[0]
            req_list[0]["repo"] = self.parsed_event["repo_id"].split("/", maxsplit=1)[1]
        else:
            # The post was to /repo so the items in the body need to specify
            # the repo
            req_list = self._parse_repo_body(repo_in_path=False)

        return req_list

    def _parse_repo_body(self, repo_in_path) -> list:
        """
        Converts the event body string into a list of requests, converts the categories to plugins within the requests,
        and validates the request body list.
        :param event: event dict object
        :param repo_in_path: Answers True if the repo info is in the URL path or in the body.
        :return: list of parsed requests
        """
        request_list = self._load_json_string_into_list(self.event.get("body") or "{}")
        request_list = self._check_and_replace_plugins_with_category(
            request_list, PLUGIN_LIST_BY_CATEGORY, DEFAULT_DISABLED_CATEGORIES
        )
        if repo_in_path:
            self.validator.validate_request_body(
                request_list, self.event.get("service_id"), self.validator._validate_request_item_no_repo
            )
        else:
            self.validator.validate_request_body(
                request_list, self.event.get("service_id"), self.validator._validate_request_item_with_repo
            )
        return request_list

    def _load_json_string_into_list(self, str_body: str) -> list:
        """
        Parses string of dictionary or list and appends to a list.
        :param str_body: JSON string representing either a list or dictionary
        :return: list containing the json body
        """
        try:
            body = json.loads(str_body)
        except json.JSONDecodeError:
            raise ValidationError("Invalid JSON in request body")

        if isinstance(body, dict):
            return [body]
        if isinstance(body, list):
            return body
        raise ValidationError("Expected dict or list in request body")

    def parse_whitelist_body(self):
        ret = self._load_json_string_into_list(self.event.get("body") or "{}")
        self.validator.validate_request_body(ret, self.event.get("service_id"), self.validator._validate_whitelist_item)
        return ret

    def _check_and_replace_plugins_with_category(
        self, requests: list, category_dict: dict, default_disabled_categories: list
    ) -> list:
        """
        Iterates through the request_list, determining if 'categories' exist in each,
        updating the list of plugins accordingly
        :param request_list: list of requests
        :param category_dict: dictionary of categories and their plugins
        :return: updated list of requests
        """
        request_list = copy.deepcopy(requests)

        # Build the category and plugin lists from the passed-in category dictionary
        category_list = list(category_dict.keys())
        plugin_list = []
        for plugin_cat in category_dict:
            plugin_list.extend(category_dict.get(plugin_cat))

        plugin_flags = {}
        for plugin_cat in category_dict:
            plugin_flags.update(category_dict.get(plugin_cat, {}))

        for request in request_list:
            # Split the request category list into the positive and negative categories
            if request.get("categories") is not None and not isinstance(request.get("categories"), list):
                raise ValidationError("A list of categories is required")
            categories = set([c for c in (request.get("categories") or []) if not c.startswith("-")])
            negated_cats = set([c[1:] for c in (request.get("categories") or []) if c.startswith("-")])

            # Go through the default disabled categories and if they're not included in the list of included
            # categories add them to the list of negated categories
            for cat in default_disabled_categories:
                if cat not in categories:
                    negated_cats.add(cat)

            # Split the request plugin list into the positive and negative plugins
            if request.get("plugins") is not None and not isinstance(request.get("plugins"), list):
                raise ValidationError("A list of plugins is required")
            plugins = set([p for p in (request.get("plugins") or []) if not p.startswith("-")])
            negated = set([p[1:] for p in (request.get("plugins") or []) if p.startswith("-")])

            # If no categories were explictly included and no plugins were explicitly set use all the categories
            # excluding the negated ones
            if not categories and not plugins:
                categories = set(category_list) - negated_cats
            else:
                # If categories were included the set of negated categories is all the others, including those
                # explicitly negated.
                negated_cats = (set(category_list) - categories).union(negated_cats)

            # Add the plugins from negated categories to the negated plugins set
            for category in negated_cats:
                self.validator.validate_category(category, category_list)
                category_plugins = category_dict.get(category)
                negated.update(category_plugins or [])
                negated = negated - plugins  # Don't negate plugins explicitly included.

            # Add the plugins from the included categories to the positive plugins set, excluding the negated ones
            for category in categories:
                self.validator.validate_category(category, category_list)
                category_plugins = list(set(category_dict.get(category)) - negated)
                plugins.update(category_plugins or [])

            # Apply the feature flags
            disabled_plugins = set()
            for plugin in plugins:
                if plugin_flags.get(plugin) is not None and (  # Plugin has a feature flag
                    not self.identity  # Identity object has not been set
                    or not self.identity.features.get(plugin_flags[plugin], False)  # Identity has feature flag disabled
                ):
                    # Plugin is enabled and has an associated feature flag but the
                    # identity does not have the flag enabled so disable the plugin
                    disabled_plugins.add(plugin)
            plugins = plugins - disabled_plugins  # Remove disabled plugins from positive list
            negated = negated.union(disabled_plugins)  # Add disabled plugins to negative list

            # Set the the updated plugins list
            request["plugins"] = list(plugins)
            request["plugins"] += [f"-{p}" for p in negated]

            # Set the updated categories list
            request["categories"] = list(categories)
            request["categories"] += [f"-{c}" for c in negated_cats]

        return request_list

    def parse_report_body(self):
        ret = self._load_json_string_into_list(self.event.get("body") or "{}")
        self.validator.validate_request_body(ret, self.event.get("service_id"), self.validator._validate_report_item)
        return ret
