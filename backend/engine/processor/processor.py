import json
import os
from base64 import b64decode
from datetime import datetime, timezone
from string import Template
from typing import Tuple

import boto3
from botocore.exceptions import ClientError
from django.db.models import Q, QuerySet

from artemisdb.artemisdb.consts import AllowListType, PluginType
from artemisdb.artemisdb.models import RepoVulnerabilityScan
from artemislib.datetime import get_utc_datetime
from artemislib.db_cache import DBLookupCache
from artemislib.github.app import GithubApp
from artemislib.logging import Logger
from env import APPLICATION, REGION, SQS_ENDPOINT, VULNERABILITY_EVENTS_ENABLED, METADATA_EVENTS_ENABLED
from metadata.metadata import get_all_metadata
from processor.details import Details
from processor.sbom import process_sbom
from processor.sbom_cdx import process_sbom as process_sbom_cdx
from processor.scan_details import ScanDetails
from processor.vulns import process_vulns, resolve_vulns
from utils.deploy_key import create_ssh_url, git_clone
from utils.engine import get_key
from utils.git import git_clean, git_pull, git_reset
from utils.plugin import Result, is_plugin_disabled, run_plugin, process_event_info, queue_event

logger = Logger(__name__)

# used to determine which severity is most severe
SEVERITY_DICT = {"NONE": 0, "NEGLIGIBLE": 1, "LOW": 2, "MEDIUM": 5, "HIGH": 8, "CRITICAL": 10}


class EngineProcessor:
    def __init__(
        self, services: dict, action: str, details: dict, scan_object=None, cache_item_model=None, manager=None
    ):
        """
        Main class to process engine requests
        :param services: dictionary pulled directly from the services.json "services" key
        :param action: the current requested action. The only action available is "Scan"
        :param details: all necessary details provided for the action
        :param scan_object: for testing: this will be used to replace the DBScanObject
        """
        self.action = action
        self.details = Details(details)
        self.service_dict = self._get_services_dict(services, self.details.service)
        self.action_details = self._get_action_details(details)
        self.scan = self._get_repo_scan_object(scan_object=scan_object, manager=manager)
        self.lookup_cache = DBLookupCache(cache_item_model=cache_item_model)
        self.severity_dict = SEVERITY_DICT

    def _get_repo_scan_object(self, scan_object=None, manager=None):
        """
        Normally, returns the DBScanObject.
        If testing, scan_object will be set and returned.
        :param scan_object:
        :return:
        """
        if scan_object is None:
            from processor.scan import DBScanObject  # pylint: disable=import-outside-toplevel

            return DBScanObject(self.details.repo, self.details.service, self.action_details.scan_id, manager=manager)
        return scan_object

    def _get_services_dict(self, services: dict, service: str):
        """Get the service information from the services dictionary"""
        if service in services:
            return services[service]
        raise Exception("SERVICES object does not have service of name: {}".format(service))

    def _get_action_details(self, details):
        """Sets the appropriate Details class to the action_details class var.
        Currently, only the action "scan" is available
        """
        if self.action.lower() == "scan":
            return ScanDetails(details)
        raise Exception("Action not supported: {}".format(self.action))

    def queue_callback(self, status):
        if not self.details.callback_url:
            return

        logger.info(
            "Queuing callback for %s (%s, %s)", self.details.repo, self.details.callback_url, self.details.client_id
        )
        try:
            sqs = boto3.client("sqs", endpoint_url=SQS_ENDPOINT, region_name=REGION)
            sqs.send_message(
                QueueUrl=os.environ.get("CALLBACK_QUEUE"),
                MessageBody=json.dumps(
                    {
                        "url": self.details.callback_url,
                        "client_id": self.details.client_id,
                        "data": {"repo": f"{self.details.repo}/{self.action_details.scan_id}", "status": status},
                    }
                ),
            )
        except ClientError:
            logger.error(
                "Unable to queue callback for %s (%s, %s)",
                self.details.repo,
                self.details.callback_url,
                self.details.client_id,
            )

    def process_plugins(self, images: dict, services: dict) -> None:
        """
        Executes plugins to scan the repository, updating the DB of the progress.
        :param images: dict of image build results and how many dockerfiles were found and built
        :return: None
        """
        logger.info("Running the following plugins: %s", self.action_details.plugins)
        num_plugins = len(self.action_details.plugins)
        # Run analysis tasks here
        current_plugin = 0

        error_plugins = []

        for plugin in self.action_details.plugins:
            current_plugin += 1
            logger.info("Running plugin %s against %s:%s", plugin, self.details.repo, self.action_details.branch)
            try:
                start_time = get_utc_datetime()
                progress = {
                    "plugin_name": plugin,
                    "plugin_start_time": start_time.isoformat(timespec="microseconds"),
                    "current_plugin": current_plugin,
                    "total_plugins": num_plugins,
                }

                self.scan.update_status(f"running plugin {plugin}", progress=progress)
                results = run_plugin(
                    plugin,
                    self.scan.get_scan_object(),
                    images,
                    depth=self.action_details.depth,
                    include_dev=self.action_details.include_dev,
                    features=self.details.features,
                    services=services,
                )

                if results.disabled:
                    logger.info("Plugin %s is disabled", plugin)
                else:
                    logger.info("Plugin %s completed, updating results", plugin)

                    if results.type == PluginType.SBOM.value and plugin == "veracode_sbom":
                        process_sbom(results, self.scan.get_scan_object())

                        # SBOM results should not be returned directly in the scan, so clear details
                        results.details = []

                        # Use the CycloneDX format by default when not using veracode_sbom tool
                    elif results.type == PluginType.SBOM.value and plugin != "veracode_sbom":
                        process_sbom_cdx(results, self.scan.get_scan_object())

                        # SBOM results should not be returned directly in the scan, so clear details
                        results.details = []

                    elif results.type == PluginType.VULN.value:
                        process_vulns(results, self.scan.get_scan_object(), plugin)

                    self.scan.create_plugin_result_set(start_time, results)
                    self._cache_results(results)

                    logger.info("Plugin %s results updated", plugin)

                    # Clean and reset the repo in case the plugin wrote any files to disk. This way files created or
                    # modified by one plugin won't pollute the repo for subsequent plugins.
                    git_clean(os.path.join(self.action_details.scan_working_dir, "base"))
                    git_reset(
                        os.path.join(self.action_details.scan_working_dir, "base"),
                        self.scan.get_scan_object().include_paths,
                        self.scan.get_scan_object().exclude_paths,
                    )
            except Exception as e:  # pylint: disable=broad-except
                # Catch everything so that an error doesn't kill the engine
                # but log the exception with stack trace so it can be
                # investigated.
                logger.exception("Error running plugin %s: %s", plugin, e)
                error_plugins.append(plugin)

        # Now that all the plugins have finished resolve any vulns that were found previously via an equivalent
        # scan but that were not found now. Any plugins that failed to execute successfully are excluded to those
        # vulnerabilities are not accidentally resolved.
        resolve_vulns(self.scan.get_scan_object(), error_plugins)

        if VULNERABILITY_EVENTS_ENABLED:
            self._process_vuln_events()

    def pull_repo(self):
        logger.info("Pulling repo %s/%s:%s", self.details.service, self.details.repo, self.action_details.branch)
        url = use_hostname_or_url(self.details.service, self.action_details.url, self.service_dict)
        if self.service_dict.get("use_deploy_key") or False:
            logger.info("using ssh key to pull repo")
            service_key = get_api_key(self.service_dict, False)
            service_url = create_ssh_url(url)
            service_to_use = self.service_dict.get("hostname") or self.details.service
            return git_clone(
                self.action_details.scan_working_dir,
                service_key,
                service_to_use,
                service_url,
                self.action_details.branch,
            )
        logger.info("Pulling repo via HTTPS")
        api_key = get_api_key(self.service_dict, org=self.details.org)
        success = git_pull(
            api_key,
            url,
            self.action_details.scan_working_dir,
            not self.service_dict.get("allow_all") and self.action_details.public,
            self.action_details.branch,
            self.action_details.diff_base,
            self.service_dict.get("http_basic_auth", False),
            self.scan.get_scan_object().include_paths,
            self.scan.get_scan_object().exclude_paths,
        )
        if self.action_details.diff_base:
            # This has to happen AFTER the call to git_pull() above
            self.action_details.alter_diff_to_default()
        return success

    def _get_metadata(self) -> Tuple[dict, dict]:
        return get_all_metadata(
            self.service_dict["application_metadata"],
            self.details.service,
            self.details.repo,
            self.action_details.scan_working_dir,
        )

    def docker_images_required(self) -> bool:
        """
        Check if any plugins require building the docker images first.
        :return: True/False
        """
        for plugin in self.action_details.plugins:
            with open(os.path.join(self.action_details.plugin_path, plugin, "settings.json")) as settings_file:
                settings_dict = json.load(settings_file)
                if settings_dict.get("build_images", False) and not is_plugin_disabled(settings_dict):
                    return True
        return False

    def _set_git_diff(self) -> None:
        """
        Retrieve the specific commit hashes for a git diff spec (in
        case branches are provided) and save them to the Scan object.
        """
        if not self.action_details.diff_base:
            return
        logger.info("Storing diff specification for scan")

        # The git repo is in the "base" dir within the working dir
        git_dir = os.path.join(self.action_details.scan_working_dir, "base")
        self.scan.set_scan_diffs(git_dir, self.action_details.diff_base, self.action_details.diff_compare)
        self.scan.set_scan_diff_summary(git_dir)

    def get_scan_id(self):
        return self.action_details.scan_id

    def get_scan_working_dir(self):
        return self.action_details.scan_working_dir

    def update_scan_status(
        self, status, start_time=None, end_time=None, errors=None, progress=None, alerts=None, debug=None
    ):
        self.scan.update_status(status, start_time, end_time, errors, progress, alerts, debug)

    def update_scan_post_pull_repo(self):
        self.scan.set_application_metadata(*self._get_metadata())
        self._set_git_diff()
        self.scan.set_branch_last_commit(self.action_details.scan_working_dir)
        self.scan.save_object()

        # Now that the metadata has been formatted and stored
        # send the metadata to the metadata_queue for further processing
        if METADATA_EVENTS_ENABLED:
            self._process_metadata_events()

    def _cache_results(self, results: Result):
        if not isinstance(self.lookup_cache, DBLookupCache):
            return
        if results.type not in ["static_analysis", "vulnerability"]:
            return
        # vulnerability id
        detail_key = "type" if results.type == "static_analysis" else "id"
        for item in results.details:
            item_id = item.get(detail_key)
            item_severity = item.get("severity")
            logger.debug(f"Caching {item_id}: {item_severity}")
            if item_id is None or item_severity is None:
                logger.debug("item has no id or severity and cannot be cached.")
                continue
            cache_key = (
                f"{results.type}:severity:{item_id}:{item.get('line')}"
                if results.type == "static_analysis"
                else f"{results.type}:severity:{item_id}"
            )

            # check for a cached severity
            cached_severity = self.lookup_cache.lookup(cache_key)

            if cached_severity is None:
                self._create_severity_cache_item(cache_key, item_severity)
                continue

            most_severe = self._get_most_severe(item_severity, cached_severity)

            self._create_severity_cache_item(cache_key, most_severe)

    def _create_severity_cache_item(self, item_id, severity):
        self.lookup_cache.store(item_id, severity)

    def _get_most_severe(self, item_severity, cached_severity):
        temp = self.severity_dict.get(item_severity.upper())
        item_severity_int = temp if isinstance(temp, int) else -1

        temp = self.severity_dict.get(cached_severity.upper())
        cached_severity_int = temp if isinstance(temp, int) else -1

        most_severe = item_severity if item_severity_int >= cached_severity_int else cached_severity

        # log any unexpected severities, so we can investigate or update the severity dictionary
        # if (not in the dict) & (not empty string) then log it
        if (item_severity_int == -1) & (isinstance(item_severity, str)) & (len(item_severity) > 0):
            logger.warn(
                f"Received an unexpected item_severity: {item_severity}, caching most_severe value: {most_severe}."
            )

        return most_severe

    def _process_vuln_events(self) -> None:
        logger.info("Processing vulnerability events")

        # Get all of the vulnerability instances that were either created by this scan or resolved by this scan
        qs = self.scan.get_scan_object().repovulnerabilityscan_set.all() | RepoVulnerabilityScan.objects.filter(
            resolved=True, resolved_by=self.scan.get_scan_object()
        )

        # Pull the non-expired vulns AllowList
        allow_list = list(
            self.scan.get_scan_object().repo.allowlistitem_set.filter(
                Q(item_type=AllowListType.VULN.value),
                Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
            )
        )

        # Pull the non-expired vulns_raw AllowList
        raw_allow_object_list = self.scan.get_scan_object().repo.allowlistitem_set.filter(
            Q(item_type=AllowListType.VULN_RAW.value),
            Q(expires=None) | Q(expires__gt=datetime.utcnow().replace(tzinfo=timezone.utc)),
        )

        # Place all the raw CVEs values into a set for faster searching.
        if raw_allow_object_list:
            raw_allow_list = set(x.value["id"] for x in raw_allow_object_list)
        else:
            raw_allow_list = set()

        # Build out a plugin result structure with event info that contains these
        # vulns so that they can be processed as if they came from a plugin
        results = {"details": [], "event_info": {}}
        for vuln in qs:
            if not vuln.resolved and allowlist_vuln(vuln, allow_list, raw_allow_list):
                # Vuln is unresolved but allowlisted so skip it
                logger.debug("Vuln %s matches allowlist, excluding", vuln)
                continue
            elif vuln.resolved:
                logger.debug("Vuln %s is resolved, including", vuln)

            results["details"].append({"id": str(vuln.vuln_instance_id)})
            results["event_info"][str(vuln.vuln_instance_id)] = vuln.to_dict(
                include_resolved_by=False, include_repo=False
            )

        # Send the results for processing into the event queue
        process_event_info(self.scan.get_scan_object(), results, PluginType.VULN.value, None)

    def _process_metadata_events(self) -> None:
        """
        Queues a metadata event when METADATA_EVENTS_ENABLED is true
        :return: None
        """
        logger.info("Processing Metadata Events")
        scan = self.scan.get_scan_object()

        # Check if a branch was provided
        default_branch = self.action_details.branch is None

        # Process Metadata event
        if default_branch & METADATA_EVENTS_ENABLED:
            payload = {
                "repo": scan.repo.repo,
                "type": "metadata",
                "application_metadata": scan.application_metadata,
            }
            logger.info(payload)
            queue_event(scan.repo.repo, "metadata", payload)

def get_api_key(service_dict: dict, api_key=True, org=None):
    """gets service API key from AWS Secrets Manager
    if api_key is True, the "key" value is pulled
    if api_key is False, the "deploy-key" value is pulled and placed into an ssh key
    file
    :param service_dict: dict of service information
    :param api_key: bool indication of whether to get the API key or deploy key from
    secrets manager.
    :return: api key string or deploy key file path.
    """
    if service_dict.get("app_integration", False) and org is not None:
        github_app = GithubApp()
        token = github_app.get_installation_token(org)
        if token:
            logger.info("Using GitHub App authentication")
            return f"x-access-token:{token}"

    secret_name = f"{APPLICATION}/{service_dict.get('secret_loc')}"
    get_secret_value_response = get_key(secret_name)
    if not get_secret_value_response:
        return None
    # Decrypts secret using the associated KMS CMK.
    # Depending on whether the secret is a string or binary, one of these
    # fields will be populated.
    if "SecretString" in get_secret_value_response:
        secret = get_secret_value_response["SecretString"]
        secrets_dict = json.loads(secret)
        if api_key:
            key = secrets_dict.get("key")
            return handle_key(key, service_dict.get("type"), service_dict.get("api_key_add"))

        return secrets_dict.get("deploy-key")
    return None


def use_hostname_or_url(service: str, url: str, service_dict: dict) -> str:
    """
    if a reverse proxy is used to get a repository the original service name needs to be replaced
    by the hostname of the reverse proxy.
    If hostname is populated,replace the service with the hostname in the url
    :param service: name of the service
    :param url: url to pull the repository from the service
    :param service_dict: the service.json service dictionary
    :return: unchanged url or url which has the service name replaced by the hostname.
    """
    if service_dict:
        if service_dict.get("hostname"):
            return url.replace(service, service_dict.get("hostname"))
    return url


def handle_key(key, service_type, service_key) -> str or None:
    """
    The api key sometimes needs to be altered in order to be accepted by the service.
    :param key: api key for the service
    :param service_type: type of service. In this case, it only matters if it is bitbucket or not
    :param service_key: service_key is how to the key will be altered.
    It can be None, other, or a template such as auth:$key
    :return: unaltered or altered key, or None if there was an issue.
    """
    if not service_key:
        return key
    if service_key != "other":
        return Template(service_key).substitute(key=key)
    if service_type == "bitbucket":
        # BitBucket key is base64(user:pass) because that's what the
        # API needs for basic auth. For git, though, it needs to be
        # base64 decoded first.
        return b64decode(key).decode("utf-8")
    return None


def allowlist_vuln(vuln: RepoVulnerabilityScan, allow_list: QuerySet, raw_allow_list: list) -> bool:
    """
    Determine whether RepoVulnerabilityScan object should be filtered out by the allowlist
    """
    for adv_id in vuln.vulnerability.advisory_ids:
        if adv_id in raw_allow_list:
            # Advisory ID is in the list of raw IDs to filter out
            logger.debug("Vuln matches %s in the raw allow list", adv_id)
            return True
    for vsp in vuln.vulnerabilityscanplugin_set.all():
        components = []
        for component in vsp.components.all():
            components.append(f"{component.name}-{component.version}")
        for item in allow_list:
            if (
                item.value["id"] in vuln.vulnerability.advisory_ids
                and item.value["component"] in components
                and item.value["source"] in vsp.source
            ):
                # This AL item matches a component and source of this vuln instance
                logger.debug(
                    "Vuln matches <%s, %s, %s> in the allow list",
                    item.value["id"],
                    item.value["component"],
                    item.value["source"],
                )
                return True
    return False
