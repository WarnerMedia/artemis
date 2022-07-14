# pylint: disable=no-member
import json
import logging
import sys
from datetime import datetime, timedelta, timezone
from json import JSONDecodeError

from artemisapi.authorizer import check_auth
from repo.util.const import DB_TTL_DAYS, PLUGIN_LIST_BY_CATEGORY, QUALIFIED_PLUGINS
from repo.util.env import (
    APPLICATION,
    DEFAULT_BATCH_PRIORITY,
    DEFAULT_DEPTH,
    DEFAULT_INCLUDE_DEV,
    DEFAULT_ORG,
    REV_PROXY_SECRET,
)


class GetProxySecret:
    _secret = None

    def __new__(cls):
        if not cls._secret:
            from repo.util.aws import AWSConnect  # pylint: disable=import-outside-toplevel

            aws_connect = AWSConnect()
            cls._secret = aws_connect.get_key(REV_PROXY_SECRET)["SecretString"]
        return cls._secret


class Logger:
    _instance = None

    def __new__(cls, name: str):
        if cls._instance is None:
            cls._instance = logging.getLogger(name.strip())
            console = logging.StreamHandler(sys.stdout)
            formatter = logging.Formatter(
                fmt="%(asctime)s %(levelname)-8s [%(name)-12s] %(message)s", datefmt="[%Y-%m-%d %H:%M:%S]"
            )
            console.setFormatter(formatter)
            cls._instance.addHandler(console)
            cls._instance.setLevel(logging.INFO)
            cls._instance.propagate = False
        return cls._instance


log = Logger(__name__)


def auth(repo: str, service: str, authz: list[list[list[str]]]) -> bool:
    # Validate that this API key is authorized for this service/repo
    return check_auth(f"{service}/{repo}".lower(), authz)


def build_options_map(req_list):
    options_map = {}
    for req in req_list:
        org_name = req.get("org", DEFAULT_ORG)

        options_map[f"{org_name}/{req['repo']}".lower()] = {
            "plugins": req.get("plugins", []),
            "depth": req.get("depth", DEFAULT_DEPTH),
            "include_dev": req.get("include_dev", DEFAULT_INCLUDE_DEV),
            "callback_url": req.get("callback", {}).get("url"),
            "client_id": req.get("callback", {}).get("client_id"),
            "batch_priority": req.get("batch_priority", DEFAULT_BATCH_PRIORITY),
            "categories": req.get("categories", []),
            "diff_base": req.get("diff_base"),
            "schedule_run": req.get("schedule_run"),
            "batch_id": req.get("batch_id"),
        }

    return options_map


def get_api_key(service_secret):
    from repo.util.aws import AWSConnect  # pylint: disable=import-outside-toplevel

    aws_connect = AWSConnect()
    secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
    if secret:
        return secret.get("key")
    return None


def get_iso_timestamp():
    return datetime.utcnow().replace(tzinfo=timezone.utc).isoformat(timespec="microseconds")


def get_json_from_response(response_text: str) -> dict or None:
    try:
        return json.loads(response_text)
    except (JSONDecodeError, TypeError) as e:
        log.error("Error occurred converting response to JSON: %s\n Error: %s", response_text, e)
        return None


def get_object_from_json_dict(json_object: dict, traversal_list: list):
    cur_object = json_object
    for item in traversal_list:
        cur_object = cur_object.get(item)
        if cur_object is None:
            log.error("Could not find key %s in response object. \n Returning None.", item)
            return None
    return cur_object


def get_ttl_expiration(ttl_days=DB_TTL_DAYS):
    return datetime.utcnow() + timedelta(days=ttl_days)


def is_sbom(plugins: list) -> bool:
    for plugin in PLUGIN_LIST_BY_CATEGORY["sbom"]:
        if plugin in plugins:
            return True
    return False


def is_qualified(plugins: list, qualified_plugins: dict = None) -> bool:
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

    if qualified_plugins is None:
        qualified_plugins = QUALIFIED_PLUGINS

    # Loop through the categories
    for category in qualified_plugins:
        # Loop through all of the lists that must match (the AND loop)
        for plugin_list in qualified_plugins[category]:
            # Loop through the sublists that have to have at least one match (the OR loop)
            for plugin in plugin_list:
                if plugin in plugins:
                    # One plugin matches from the OR list so break out of the loop
                    break
            else:
                # The OR loop exited without hitting the break statement so the OR fails
                # which means the AND fails and this scan does not meet the qualifications
                return False

    # If we made it this far then the scan meets the qualifications
    return True
