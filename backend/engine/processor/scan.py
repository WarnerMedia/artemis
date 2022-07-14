from artemisdb.artemisdb.models import Repo, Scan
from artemislib.datetime import from_iso_timestamp, get_utc_datetime
from artemislib.logging import Logger
from utils.git import get_last_commit_timestamp, git_rev_parse, git_summary
from utils.plugin import Result

logger = Logger(__name__)


class DBScanObject:
    """
    Class dedicated to the following:
     - protecting the scan object
     - isolating the artemisdb import to one file
     - placing all scan object related updates into one location
     - providing an easy object to mock during testing
    """

    def __init__(self, repo, service, scan_id, manager=None):
        self._repo = Repo.objects.get(repo=repo, service=service)
        self._scan = self._repo.scan_set.get(scan_id=scan_id)

        if manager is not None:
            # Associate the scan with the engine object held by the manager
            self._scan.engine = manager._engine
            self._scan.save()

    def update_status(
        self, status, start_time=None, end_time=None, errors=None, progress=None, alerts=None, debug=None
    ):
        self._scan.status = status
        if errors:
            self._scan.errors = errors
        if progress:
            self._scan.progress.update(progress)
        if start_time:
            self._scan.start_time = start_time
        if end_time:
            self._scan.end_time = end_time
        if alerts:
            self._scan.alerts = alerts
        if debug:
            self._scan.debug = debug
        self._scan.save()

    def set_application_metadata(self, metadata, timestamps):
        self._scan.application_metadata = metadata

        # Update the metadata stored at the repo level if it is older than what this scan retrieved
        repo_updated = False
        for scheme in metadata:
            # Get the current timestamp for this scheme's metadata
            timestamp = self._repo.application_metadata_timestamps.get(scheme)
            # If the timestamp is not set or is older than the current timestamp update the metadata in the repo
            if timestamps[scheme] is not None and (
                timestamp is None or from_iso_timestamp(timestamp) < from_iso_timestamp(timestamps[scheme])
            ):
                logger.info(
                    "Application metadata from scheme %s is newer than stored in repository record (%s > %s), updating",
                    scheme,
                    timestamps[scheme],
                    timestamp,
                )
                self._repo.application_metadata[scheme] = metadata[scheme]
                self._repo.application_metadata_timestamps[scheme] = timestamps[scheme]
                repo_updated = True

        # Only write to the DB once all the schemes have been accounted for and if there were changes
        if repo_updated:
            self._repo.save()

    def create_plugin_result_set(self, start_time, results: Result):
        self._scan.pluginresult_set.create(
            plugin_name=results.name,
            plugin_type=results.type,
            start_time=start_time,
            end_time=get_utc_datetime(),
            success=results.success,
            details=results.details,
            errors=results.errors,
            alerts=results.alerts,
            debug=results.debug,
        )

    def set_branch_last_commit(self, scan_working_dir):
        self._scan.branch_last_commit_timestamp = get_last_commit_timestamp(scan_working_dir)

    def get_scan_object(self) -> Scan:
        """
        Returns the protected scan object.
        DO NOT USE TO UPDATE OBJECT
        """
        return self._scan

    def save_object(self):
        self._scan.save()

    def set_scan_diffs(self, git_dir, base, compare):
        # Get the commit hashes and save them to the Scan object
        self._scan.diff_base = git_rev_parse(git_dir, base)
        self._scan.diff_compare = git_rev_parse(git_dir, compare)

        # Log the diff spec in .. notation to ease debugging
        logger.info("%s..%s", self._scan.diff_base, self._scan.diff_compare)

    def set_scan_diff_summary(self, git_dir):
        self._scan.diff_summary = git_summary(git_dir, self._scan.diff_base, self._scan.diff_compare)
