import importlib
import uuid
from datetime import datetime
from urllib.parse import quote_plus

import simplejson
from django.db import connection, models
from django.db.models import Q
from django.utils.functional import cached_property

from artemisdb.artemisdb.consts import (
    MAX_REASON_LENGTH,
    AllowListType,
    ComponentType,
    EngineState,
    PluginType,
    ReportStatus,
    ReportType,
    RiskClassification,
    ScanStatus,
    Severity,
    SystemAllowListType,
)
from artemisdb.artemisdb.env import DOMAIN_NAME, METADATA_FORMATTER_MODULE
from artemisdb.artemisdb.fields.ltree import LtreeField
from artemisdb.artemisdb.util.auth import group_chain_filter
from artemisdb.artemisdb.util.severity import ComparableSeverity
from artemislib.aws import AWSConnect
from artemislib.consts import SCAN_DATA_S3_KEY
from artemislib.datetime import format_timestamp
from artemislib.db_cache import DBLookupCache
from artemislib.env import SCAN_DATA_S3_BUCKET, SCAN_DATA_S3_ENDPOINT
from artemislib.logging import Logger
from artemislib.services import get_services_and_orgs_for_scope

LOG = Logger(__name__)

METADATA_FORMATTER = None
if METADATA_FORMATTER_MODULE:
    try:
        m = importlib.import_module(METADATA_FORMATTER_MODULE)
        METADATA_FORMATTER = m.formatter
    except (ModuleNotFoundError, AttributeError) as e:
        LOG.error("Unable to load metadata formatter module %s. Error: %s", METADATA_FORMATTER_MODULE, e)


class User(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # User email. This will come from the SAML token and be populated on first login.
    email = models.EmailField(unique=True)

    # User scanning scope. This is set by an admin to restrict what the user is allowed to scan
    scope = models.JSONField(encoder=simplejson.JSONEncoder)

    # Last time the user logged in
    last_login = models.DateTimeField(null=True)

    # Admin privileges
    admin = models.BooleanField(default=False)

    # User-based feature toggles
    features = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    # Soft delete flag
    deleted = models.BooleanField(default=False)

    groups = models.ManyToManyField("Group", through="GroupMembership")

    class Meta:
        app_label = "artemisdb"

    def __str__(self):
        return str(self.email)

    def to_dict(self):
        return {
            "email": self.email,
            "admin": self.admin,
            "last_login": format_timestamp(self.last_login),
            "scope": self.scope,
            "features": self.features,
        }

    @cached_property  # Prevents a DB query every time this is accessed (just the first time)
    def self_group(self):
        return self.groups.get(self_group=True)

    @property
    def scan_orgs(self):
        scan_orgs = []

        # Get the scan orgs from the user's groups
        for group in self.groups.filter(deleted=False):
            scan_orgs += get_services_and_orgs_for_scope(group.scope)

        # Gather scan_orgs for any linked service accounts
        for user_service in self.userservice_set.all():
            scan_orgs += user_service.scan_orgs.get("orgs")

        # Remove duplicates
        return sorted(list(set(scan_orgs)))


class ScanSchedule(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing schedule ID (not PK)
    schedule_id = models.UUIDField(unique=True)

    # User that owns the schedule. Scans initiated on this schedule will be owned by this user
    owner = models.ForeignKey(User, on_delete=models.CASCADE)

    # Short name (required)
    name = models.CharField(max_length=64)

    # Long description (optional)
    description = models.CharField(max_length=1024, null=True)

    # Whether the schedule is enabled or not. Disabled schedules do not run.
    enabled = models.BooleanField(default=True)

    # Scanning every X minutes
    interval_minutes = models.PositiveIntegerField(null=True)

    # Scan on certain day of the week
    # Monday = 0, Sunday = 6
    day_of_week = models.PositiveSmallIntegerField(null=True)

    # Scan on certain day of the month
    day_of_month = models.PositiveSmallIntegerField(null=True)

    # Time of day is used in conjunction with day of week and day of month schedules. Always UTC.
    time_of_day = models.TimeField(null=True)

    # Calculated next scan time to determine which repos need to have scans initiated
    next_scan_time = models.DateTimeField()

    # Scan parameters
    categories = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    plugins = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    depth = models.IntegerField(default=500)
    include_dev = models.BooleanField(default=False)

    def __str__(self):
        return f"<ScanSchedule: {self.schedule_id}, {self.name}>"


class ScanScheduleRun(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing run ID (not PK)
    run_id = models.UUIDField(unique=True)

    # Scan schedule this run is of
    schedule = models.ForeignKey(ScanSchedule, on_delete=models.CASCADE)

    # The time of this run
    created = models.DateTimeField(auto_now_add=True)

    # Scan parameters. These are stored independently from the scan schedule so that if the
    # schedule is modified the parameters used during the run are preserved.
    categories = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    plugins = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    depth = models.IntegerField(default=500)
    include_dev = models.BooleanField(default=False)

    def __str__(self):
        return f"<ScanScheduleRun: {self.run_id}, {self.schedule}>"


class Repo(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Repo definition
    repo = models.CharField(max_length=256)
    service = models.CharField(max_length=256)

    # Risk classification
    risk = models.CharField(max_length=32, choices=[(r, r.value) for r in RiskClassification], null=True)

    # Scan schedule
    schedules = models.ManyToManyField(ScanSchedule, through="RepoScanSchedule")

    # Application metadata
    application_metadata = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)
    # For determining whether to update during a scan. Contains the structure:
    #  {
    #    "scheme": "TIMESTAMP"
    #  }
    # This allows each metadata scheme to maintain an independent timestamp
    application_metadata_timestamps = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["repo", "service"]

    def __str__(self):
        return f"{self.service}/{self.repo}"

    def to_dict(self, include_qualified_scan: bool = False, include_app_metadata: bool = False):
        ret = {"service": self.service, "repo": self.repo, "risk": self.risk}
        if include_qualified_scan:
            scan = self.scan_set.filter(qualified=True).order_by("-created").only("created", "scan_id").first()
            if scan:
                ret["qualified_scan"] = {"created": format_timestamp(scan.created), "scan_id": str(scan.scan_id)}
            else:
                ret["qualified_scan"] = None
        if include_app_metadata:
            ret["application_metadata"] = self.formatted_application_metadata()
        return ret

    @classmethod
    def in_scope(cls, scopes: list[list[list[str]]]) -> models.QuerySet:
        # Performance shortcut
        for group_chain in scopes:
            if group_chain == [["*"]]:
                return cls.objects.all()

        filter = Q()

        for group_chain in scopes:
            filter |= group_chain_filter(group_chain)

        if filter:
            # Return the Repo QuerySet that matches the filter
            return cls.objects.filter(filter)
        else:
            # No filter was built up (no scopes?) so return nothing
            return cls.objects.none()

    def formatted_application_metadata(self):
        # If a custom metadata formatter is configured use it
        if METADATA_FORMATTER is not None:
            return METADATA_FORMATTER(self.application_metadata)
        return self.application_metadata


class RepoScanSchedule(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    repo = models.ForeignKey(Repo, on_delete=models.CASCADE)
    schedule = models.ForeignKey(ScanSchedule, on_delete=models.CASCADE)
    ref = models.CharField(max_length=256, null=True)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["repo", "schedule", "ref"]

    def __str__(self):
        return f"<RepoScanSchedule: {self.repo}, {self.ref}, {self.schedule}>"


class ScanScheduleRetry(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing retry ID (not PK)
    retry_id = models.UUIDField(unique=True)

    # Scan schedule run instance this retry is tied to
    run = models.ForeignKey(ScanScheduleRun, on_delete=models.CASCADE)

    # Repo and scan config to retry
    repo = models.ForeignKey(Repo, on_delete=models.CASCADE)
    scan_config = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    retry_time = models.DateTimeField()
    count_remaining = models.PositiveSmallIntegerField(default=3)

    errors = models.JSONField(encoder=simplejson.JSONEncoder, default=list)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["repo", "run"]

    def __str__(self):
        return f"<ScanScheduleRetry: {self.repo}, count_remaining={self.count_remaining}, retry_time={self.retry_time}>"


class Group(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing group ID (not PK)
    group_id = models.UUIDField(default=uuid.uuid4, unique=True)

    # ID of group this group inherits from or null. The permissions of this group cannot exceed those of the parent
    # group. If null, the permissions are only editable by an Artemis admin.
    parent = models.ForeignKey("Group", on_delete=models.SET_NULL, null=True)

    # Group Name
    name = models.CharField(max_length=64)

    # Group Description
    description = models.CharField(max_length=256, null=True)

    # Creation date/time
    created = models.DateTimeField(auto_now_add=True)

    # User who created the group
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    # Date Group was last updated
    updated = models.DateTimeField(auto_now=True)

    # Scanning scope for the group members
    scope = models.JSONField(encoder=simplejson.JSONEncoder)

    # Dictionary of feature flags
    features = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    # Members of this group can manage the AllowLists for repos that match the scope
    allowlist = models.BooleanField(default=False)

    # Boolean for whether the group has admin permissions
    admin = models.BooleanField(default=False)

    # If true group is not shown in API results
    hidden = models.BooleanField(default=False)

    # If true group is a self_group
    self_group = models.BooleanField(default=False)

    # If true group cannot be edited via groups API. Used for self-groups that are edited by the User API
    locked = models.BooleanField(default=False)

    # Soft deleting Groups
    deleted = models.BooleanField(default=False)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["parent", "name"]

    def __str__(self):
        return str(self.name)

    def to_dict(self):
        return {
            "id": str(self.group_id),
            "parent": str(self.parent.group_id) if self.parent else None,
            "name": self.name,
            "description": self.description,
            "created": format_timestamp(self.created),
            "created_by": str(self.created_by) if self.created_by else None,
            "updated": format_timestamp(self.updated),
            "permissions": {
                "scope": self.scope,
                "features": self.features,
                "allowlist": self.allowlist,
                "admin": self.admin,
            },
        }

    @classmethod
    def create_self_group(cls, user: User) -> None:
        # create "self" group for each user and add user's scope and feature to this group
        self_group = cls.objects.create(
            name=user.email,
            description="self",
            created_by=user,  # The user is always recorded as the creator of the self group
            scope=user.scope,
            features=user.features,
            admin=user.admin,
            locked=True,
            hidden=True,
            self_group=True,
            allowlist=True,
        )
        # add group membership with "self" and the user
        self_group.groupmembership_set.create(user=user)


class GroupMembership(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Group model
    group = models.ForeignKey("Group", on_delete=models.CASCADE)

    # User who is a member of the group,
    user = models.ForeignKey("User", on_delete=models.CASCADE)

    # Boolean for whether the user is an admin of the group
    group_admin = models.BooleanField(default=False)

    # Timestamp when the user was added to the group
    added = models.DateTimeField(auto_now_add=True)

    def to_dict(self):
        return {
            "email": self.user.email,
            "group_admin": self.group_admin,
            "added": format_timestamp(self.added),
        }


class UserService(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Artemis User
    user = models.ForeignKey("User", on_delete=models.CASCADE)

    # Service
    # Example: github
    service = models.CharField(max_length=256)

    # Service Username
    username = models.CharField(max_length=256)

    # Service orgs that this user is a member of
    # Example: {"orgs":  ["testorg1", "testorg2"], "updated": "2021-08-31T17:20:44.701411+00:00"}
    scan_orgs = models.JSONField()

    # Creation Timestamp
    # Example: 2021-08-31T17:20:44.701411+00:00
    created = models.DateTimeField(auto_now_add=True)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["user", "service"]

    def to_dict(self):
        return {
            "service": self.service,
            "username": self.username,
            "scan_orgs": self.scan_orgs,
            "created": self.created,
        }


class Engine(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    engine_id = models.CharField(max_length=64)
    start_time = models.DateTimeField(null=True)
    shutdown_time = models.DateTimeField(null=True)
    state = models.CharField(max_length=64, choices=[(s, s.value) for s in EngineState])

    plugins = models.ManyToManyField("Plugin", through="EnginePlugin")


class ScanBatch(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing batch ID (not PK)
    batch_id = models.UUIDField(unique=True)

    # Description of this scan batch
    description = models.CharField(max_length=1024)

    # Batch creation time
    created = models.DateTimeField(auto_now_add=True)

    # User who created the batch
    created_by = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True)

    def to_dict(self, include_stats=False):
        ret = {
            "batch_id": str(self.batch_id),
            "description": self.description,
            "created": format_timestamp(self.created),
            "created_by": str(self.created_by),
            "stats": {},
        }
        if include_stats:
            ret["stats"] = self.stats
        return ret

    @property
    def stats(self):
        try:
            with connection.cursor() as cursor:
                cursor.execute(
                    """
SELECT
    COUNT(id) AS scan_count,
    (SELECT COUNT(id) FROM artemisdb_engine WHERE id IN (
        SELECT engine_id FROM artemisdb_scan WHERE batch_id=%s
    )) AS engine_count,
    MAX(end_time)-MIN(start_time) AS duration,
    (COUNT(id)/(EXTRACT(EPOCH FROM MAX(end_time)-MIN(start_time))/3600))/(
        SELECT COUNT(id) FROM artemisdb_engine WHERE id IN (
            SELECT engine_id FROM artemisdb_scan WHERE batch_id=%s
        )
    ) AS scan_rate_per_engine_per_hour,
    MAX(end_time) AS last_scan_completed,
    MIN(start_time) AS first_scan_started,
    AVG(end_time-start_time) AS avg_scan_duration
FROM artemisdb_scan WHERE status=%s AND batch_id=%s;
""",
                    (self.pk, self.pk, ScanStatus.COMPLETED.value, self.pk),
                )
                columns = [col[0] for col in cursor.description]
                row = cursor.fetchone()
                batch_stats = dict(zip(columns, row))  # Convert the row into a dictionary using the column names
                # Convert timestamps and such to strings
                for col in ("last_scan_completed", "first_scan_started", "duration", "avg_scan_duration"):
                    batch_stats[col] = str(batch_stats[col])
                # Round the scan rate to 2 decimal places
                if batch_stats["scan_rate_per_engine_per_hour"] is None:
                    batch_stats["scan_rate_per_engine_per_hour"] = 0
                batch_stats["scan_rate_per_engine_per_hour"] = round(batch_stats["scan_rate_per_engine_per_hour"], 2)
                return batch_stats
        except Exception as e:
            return {"error": str(e)}


class Scan(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing scan ID (not PK)
    scan_id = models.UUIDField(unique=True)

    # Scan target definition
    repo = models.ForeignKey(Repo, on_delete=models.CASCADE)
    ref = models.CharField(max_length=256, null=True)

    # Scan status
    status = models.CharField(max_length=64, choices=[(s, s.value) for s in ScanStatus])
    progress = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)
    errors = models.JSONField(encoder=simplejson.JSONEncoder, default=list, null=True)
    alerts = models.JSONField(encoder=simplejson.JSONEncoder, default=list, null=True)
    debug = models.JSONField(encoder=simplejson.JSONEncoder, default=list, null=True)

    # Various timestamps
    created = models.DateTimeField(auto_now_add=True)  # Scan record creation time
    last_updated = models.DateTimeField(auto_now=True)  # Record last update time
    start_time = models.DateTimeField(null=True)  # Scan start time (after being queued)
    end_time = models.DateTimeField(null=True)  # Scan end time
    expires = models.DateTimeField(null=True)  # Scan purge time
    branch_last_commit_timestamp = models.DateTimeField(null=True)  # last git commit timestamp

    # Troubleshooting information
    worker = models.CharField(max_length=64, null=True)  # This is a legacy field and may not always be set
    engine = models.ForeignKey(Engine, on_delete=models.SET_NULL, null=True)

    # Additional scan data
    application_metadata = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    # User or group who initiated the scan
    owner = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    owner_group = models.ForeignKey(Group, on_delete=models.SET_NULL, null=True)

    # Scan parameters
    categories = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    plugins = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    depth = models.IntegerField(null=True)
    include_dev = models.BooleanField(default=False)
    callback = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)
    batch_priority = models.BooleanField(default=False)
    include_paths = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    exclude_paths = models.JSONField(encoder=simplejson.JSONEncoder, default=list)

    # Diff specification
    diff_base = models.CharField(max_length=256, null=True)
    diff_compare = models.CharField(max_length=256, null=True)
    diff_summary = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    # SBOM flag. This is set so that queued or in-progress SBOM scans can be identified
    # before they have any dependencies recorded in the DB.
    sbom = models.BooleanField(default=False)

    # Qualified flag. This is set when the scan config meets the minimum qualifications
    # for a standard scan.
    qualified = models.BooleanField(default=False)

    schedule_run = models.ForeignKey(ScanScheduleRun, on_delete=models.SET_NULL, null=True)

    # Optional user-defined description of this scan
    description = models.CharField(max_length=1024, null=True)

    # Batch this scan is part of
    batch = models.ForeignKey(ScanBatch, on_delete=models.CASCADE, null=True)

    class Meta:
        app_label = "artemisdb"

    def __str__(self):
        return str(self.scan_id)

    def delete_dependency_set(self):
        # A scan can potentially have hundreds of thousands or even millions of associated rows in the
        # dependency table. The dependency table contains a tree structure where the rows have foreign
        # key relationships to other rows. The result is that when Django performs the cascade deletion
        # of a scan with a large number of dependency records it can take a long time and consume a lot
        # of memory as Django builds up the relationships to perform the cascade.
        #
        # This is a performance enhancement to bypass the cascade deletion of dependencies by instead
        # having the database delete the rows associated with the scan being deleted directly instead of
        # having Django do it.
        start = datetime.utcnow()
        with connection.cursor() as cursor:
            cursor.execute(f"DELETE FROM {Dependency._meta.db_table} WHERE scan_id = %s", [self.pk])
        LOG.debug("Bulk dependency deletion of scan %s completed in %s", self.scan_id, str(datetime.utcnow() - start))

    def delete(self):
        LOG.debug("Deleting %s", self.scan_id)

        self.delete_dependency_set()

        # A scan may have data stored in S3 that needs to be deleted
        aws = AWSConnect()
        deleted = aws.delete_s3_files(
            prefix=(SCAN_DATA_S3_KEY % self.scan_id), s3_bucket=SCAN_DATA_S3_BUCKET, endpoint_url=SCAN_DATA_S3_ENDPOINT
        )
        LOG.debug("Deleted %s scan items from S3", deleted)

        return super(Scan, self).delete()

    def to_dict(self, history_format: bool = False):
        initiated_by = None
        if self.owner:
            initiated_by = str(self.owner)
        elif self.owner_group:
            initiated_by = str(self.owner_group)

        if history_format:
            return {
                "repo": f"{self.repo.repo}/{self.scan_id}",
                "service": self.repo.service,
                "branch": self.ref,
                "timestamps": {
                    "queued": format_timestamp(self.created),
                    "start": format_timestamp(self.start_time),
                    "end": format_timestamp(self.end_time),
                },
                "initiated_by": initiated_by,
                "status": self.status,
                "status_detail": {
                    "plugin_name": self.progress.get("plugin_name"),
                    "plugin_start_time": self.progress.get("plugin_start_time"),
                    "current_plugin": self.progress.get("current_plugin"),
                    "total_plugins": self.progress.get("total_plugins"),
                },
                "scan_options": {
                    "categories": self.categories,
                    "plugins": self.plugins,
                    "depth": self.depth,
                    "include_dev": self.include_dev,
                    "callback": self.callback,
                    "batch_priority": self.batch_priority,
                    "diff_compare": self.diff_compare,
                    "include_paths": self.include_paths,
                    "exclude_paths": self.exclude_paths,
                },
                "qualified": self.qualified,
                "batch_id": str(self.batch.batch_id) if self.batch else None,
                "batch_description": self.batch.description if self.batch else None,
            }
        return {
            "repo": self.repo.repo,
            "scan_id": str(self.scan_id),
            "initiated_by": initiated_by,
            "service": self.repo.service,
            "branch": self.ref,
            "engine_id": self.engine.engine_id if self.engine else self.worker,
            "scan_options": {
                "categories": self.categories,
                "plugins": self.plugins,
                "depth": self.depth,
                "include_dev": self.include_dev,
                "callback": self.callback,
                "batch_priority": self.batch_priority,
                "diff_compare": self.diff_compare,
                "include_paths": self.include_paths,
                "exclude_paths": self.exclude_paths,
            },
            "status": self.status,
            "status_detail": {
                "plugin_name": self.progress.get("plugin_name"),
                "plugin_start_time": self.progress.get("plugin_start_time"),
                "current_plugin": self.progress.get("current_plugin"),
                "total_plugins": self.progress.get("total_plugins"),
            },
            "timestamps": {
                "queued": format_timestamp(self.created),
                "start": format_timestamp(self.start_time),
                "end": format_timestamp(self.end_time),
                "branch_last_commit_timestamp": format_timestamp(self.branch_last_commit_timestamp),
            },
            "qualified": self.qualified,
            "batch_id": str(self.batch.batch_id) if self.batch else None,
            "batch_description": self.batch.description if self.batch else None,
        }

    def formatted_application_metadata(self):
        # If a custom metadata formatter is configured use it
        if METADATA_FORMATTER is not None:
            return METADATA_FORMATTER(self.application_metadata)
        return self.application_metadata

    @property
    def report_url(self) -> str:
        """
        Returns a string URL to the report of this scan in the UI. If the ARTEMIS_DOMAIN_NAME
        environment variable is not set it returns the relative path instead of the full URL.
        """
        fqdn = ""
        if DOMAIN_NAME is not None:
            fqdn = f"https://{DOMAIN_NAME}"
        params = f"service={quote_plus(self.repo.service)}&repo={quote_plus(self.repo.repo)}&id={self.scan_id}"
        return f"{fqdn}/results?{params}"


class PluginResult(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # The scan this result goes to
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE)

    # Plugin information
    plugin_name = models.CharField(max_length=64)
    plugin_type = models.CharField(max_length=64, choices=[(t, t.value) for t in PluginType])

    # Plugin execution metadata
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()

    # Plugin results
    success = models.BooleanField()
    details = models.JSONField(encoder=simplejson.JSONEncoder)
    errors = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    alerts = models.JSONField(encoder=simplejson.JSONEncoder, default=list)
    debug = models.JSONField(encoder=simplejson.JSONEncoder, default=list)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["scan", "plugin_name"]


class AllowListItem(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Externally-facing scan ID (not PK)
    item_id = models.UUIDField()

    # The repo this item goes to
    repo = models.ForeignKey(Repo, on_delete=models.CASCADE)

    # Allowlist metadata
    item_type = models.CharField(max_length=64, choices=[(t, t.value) for t in AllowListType])

    # Item details
    value = models.JSONField(encoder=simplejson.JSONEncoder)

    # Item expiration (optional)
    expires = models.DateTimeField(null=True)

    # Short explanation for reason item was added to allow list
    reason = models.CharField(max_length=MAX_REASON_LENGTH)

    # Who created the item
    created_by = models.ForeignKey(User, related_name="created_by", on_delete=models.SET_NULL, null=True)

    # Creation date/time
    created = models.DateTimeField(auto_now_add=True, null=True)

    # Who last modified the item
    updated_by = models.ForeignKey(User, related_name="updated_by", on_delete=models.SET_NULL, null=True)

    # Date AllowlistItem was Updated On
    updated = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        app_label = "artemisdb"

    def to_dict(self):
        return {
            "id": str(self.item_id),
            "type": self.item_type,
            "value": self.value,
            "expires": format_timestamp(self.expires),
            "reason": self.reason,
            "created_by": str(self.created_by) if self.created_by else None,
            "created": format_timestamp(self.created) if self.created else None,
            "updated_by": str(self.updated_by) if self.updated_by else None,
            "updated": format_timestamp(self.updated) if self.updated else None,
        }

    @property
    def severity(self):
        """
        Identifies the necessary key to get the necessary CacheItem key
        and returns the lookup results.
        Only static_analysis, vulnerability, and vulnerability_raw are valid types for this function.
        The default key, id, is for vulnerability and vulnerability_raw
        return: cached severity
        """
        if self.item_type not in ["static_analysis", "vulnerability", "vulnerability_raw"]:
            return None
        return DBLookupCache().lookup(self._severity_cache_key)

    @property
    def _severity_cache_key(self):
        if self.item_type == "static_analysis":
            return f"static_analysis:severity:{self.value['type']}:{self.value['line']}"
        else:
            # if the type isn't static_analysis, it's either vuln or vuln_raw. Setting type as vulnerability
            return f"vulnerability:severity:{self.value['id']}"


class APIKey(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # The user that owns the API key
    user = models.ForeignKey(User, on_delete=models.CASCADE)

    # The group that owns the API key
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True)

    # API key ID
    key_id = models.UUIDField(unique=True)

    # Hashed API key secret
    key_hash = models.CharField(max_length=256, unique=True)

    # User-defined key name
    name = models.CharField(max_length=256)

    # Creation time
    created = models.DateTimeField(auto_now_add=True)

    # Last time the key was used
    last_used = models.DateTimeField(null=True)

    # Key expiration (optional)
    expires = models.DateTimeField(null=True)

    # API key scanning scope. This is set by the user to restrict what the API key is allowed to scan. It will be
    # a subset of the user's scanning scope.
    scope = models.JSONField(encoder=simplejson.JSONEncoder)

    # Admin privileges
    admin = models.BooleanField(default=False)

    # Key-based feature toggles
    features = models.JSONField(encoder=simplejson.JSONEncoder, default=dict)

    # This key is allowed to generate scheduled scans on behalf of another user. This is an internal-only
    # field that will allow the scan_schedule_processer lambda to create scans that include a schedule ID.
    #
    # When a scan is initiated using a key with this set to true and the scan request includes a schedule ID
    # the scan owner will be set to the schedule owner rather than the API key owner.
    #
    # The API will reject scan requests that include a schedule ID if this field is set to false.
    scheduler = models.BooleanField(default=False)

    class Meta:
        app_label = "artemisdb"

    def to_dict(self):
        return {
            "id": str(self.key_id),
            "name": self.name,
            "created": format_timestamp(self.created),
            "last_used": format_timestamp(self.last_used),
            "expires": format_timestamp(self.expires),
            "scope": self.scope,
            "admin": self.admin,
            "features": self.features,
        }


class CacheItem(models.Model):
    """
    This is a generic key/value lookup table for caching
    """

    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    # Cache lookup key
    key = models.CharField(max_length=256, unique=True)

    # Cache value
    value = models.CharField(max_length=256)

    # Expiration timestamp
    expires = models.DateTimeField(null=True)

    # Creation time
    created = models.DateTimeField(auto_now_add=True)

    # Updated time
    updated = models.DateTimeField(auto_now=True)

    # Accessed time
    accessed = models.DateTimeField(null=True)


class Report(models.Model):
    """
    This is a generated report, such as a PDF
    """

    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    report_id = models.UUIDField(unique=True)
    report_type = models.CharField(max_length=64, choices=[(t, t.value) for t in ReportType])
    status = models.CharField(max_length=64, choices=[(t, t.value) for t in ReportStatus])

    # Who created the report
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    # Timestamps
    requested = models.DateTimeField(auto_now_add=True)
    completed = models.DateTimeField(null=True)

    # Parameters for this report
    scan_id = models.UUIDField()
    filters = models.JSONField(default=dict)

    # Location of the generated report
    s3_key = models.CharField(max_length=256, null=True)

    def to_dict(self):
        return {
            "report_id": str(self.report_id),
            "report_type": self.report_type,
            "status": self.status,
            "created_by": str(self.created_by) if self.created_by else None,
            "timestamps": {
                "requested": format_timestamp(self.requested),
                "completed": format_timestamp(self.completed),
            },
            "scan_id": str(self.scan_id),
            "filters": self.filters,
        }


class License(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    license_id = models.CharField(max_length=32, unique=True)
    name = models.CharField(max_length=256)

    def __str__(self):
        return self.license_id

    class Meta:
        app_label = "artemisdb"

    def to_dict(self):
        return {"id": self.license_id, "name": self.name}


class Component(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    name = models.CharField(max_length=256)
    version = models.CharField(max_length=256)
    licenses = models.ManyToManyField(License)

    # This is an internal field to store the ltree-compatible label for this component.
    # Ltree path labels can only contain A-Za-z0-9_ characters but we want to be able to search
    # for any component within the dependency trees so we need to record the canonical
    # label for each component.
    label = models.CharField(max_length=256, unique=True)

    # This is the type of component, if we can determine it. This is used to help in looking up
    # missing license information. Knowing the package type narrows down the search.
    component_type = models.CharField(max_length=32, choices=[(r, r.value) for r in ComponentType], null=True)

    def __str__(self):
        return f"{self.name}@{self.version}"

    class Meta:
        app_label = "artemisdb"
        unique_together = ["name", "version"]

    def to_dict(self):
        return {
            "name": self.name,
            "version": self.version,
            "licenses": [license.to_dict() for license in self.licenses.all()],
        }


class Dependency(models.Model):
    label = models.CharField(max_length=256)
    path = LtreeField()
    parent = models.ForeignKey("self", null=True, related_name="children", on_delete=models.CASCADE)
    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE)
    source = models.CharField(max_length=4096, null=True)

    def __str__(self):
        return f"<Dependency: {self.component} ({self.label}), {self.path} ({self.source})>"

    class Meta:
        app_label = "artemisdb"


class RepoComponentScan(models.Model):
    # Suppress int->bigint migration
    id = models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")

    repo = models.ForeignKey(Repo, on_delete=models.CASCADE)
    component = models.ForeignKey(Component, on_delete=models.CASCADE)
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["repo", "component"]

    def __str__(self):
        return f"<RepoComponent: {self.repo}, {self.component}, {self.scan}>"

    def to_dict(self):
        return self.component.to_dict()


class SystemAllowListItem(models.Model):
    # Externally-facing ID (not PK)
    item_id = models.UUIDField()

    # Allowlist metadata
    item_type = models.CharField(max_length=64, choices=[(t, t.value) for t in SystemAllowListType])

    # Item details
    value = models.JSONField(encoder=simplejson.JSONEncoder)

    # Short explanation for reason item was added to allow list
    reason = models.CharField(max_length=MAX_REASON_LENGTH)

    # Who created the item
    created_by = models.ForeignKey(Group, related_name="%(class)s_created_by", on_delete=models.SET_NULL, null=True)

    # Creation date/time
    created = models.DateTimeField(auto_now_add=True, null=True)

    # Who last modified the item
    updated_by = models.ForeignKey(Group, related_name="%(class)s_updated_by", on_delete=models.SET_NULL, null=True)

    # Date AllowlistItem was Updated On
    updated = models.DateTimeField(auto_now=True, null=True)

    class Meta:
        app_label = "artemisdb"

    def to_dict(self):
        return {
            "id": str(self.item_id),
            "type": self.item_type,
            "value": self.value,
            "reason": self.reason,
            "created_by": str(self.created_by) if self.created_by else None,
            "created": format_timestamp(self.created) if self.created else None,
            "updated_by": str(self.updated_by) if self.updated_by else None,
            "updated": format_timestamp(self.updated) if self.updated else None,
        }


class Plugin(models.Model):
    # The internal name of the plugin
    name = models.CharField(max_length=64, unique=True)

    # The user-friendly name of the plugin
    friendly_name = models.CharField(max_length=64)

    # The plugin type
    type = models.CharField(max_length=64, choices=[(t, t.value) for t in PluginType])


class PluginConfig(models.Model):
    # Each plugin config is tied to a plugin
    plugin = models.ForeignKey("Plugin", on_delete=models.CASCADE)

    # Scope of this config
    scope = models.JSONField(encoder=simplejson.JSONEncoder)

    # Plugin specific configuration JSON
    config = models.JSONField(encoder=simplejson.JSONEncoder)


class EnginePlugin(models.Model):
    # Engine model
    engine = models.ForeignKey("Engine", on_delete=models.CASCADE)

    # Plugin that this engine has installed
    plugin = models.ForeignKey("Plugin", on_delete=models.CASCADE)

    # Whether the plugin is enabled on this engine
    enabled = models.BooleanField(default=True)


class Vulnerability(models.Model):
    # Externally-facing ID (not PK). This is the canonical ID of the vuln within Artemis.
    # A vulnerability may have one or more public IDs (CVE, etc) depending on how and when
    # it is found. For example, a newly-disclosed vuln may have a GitHub advisory ID (GHSA-*)
    # and then be assigned a CVE at a later date (CVE-*). We will need to track all of these
    # IDs for correlation purposes. This ID is an immutable ID used by the Artemis API.
    vuln_id = models.UUIDField()

    # This is the mutable list of advisory IDs associated with this vulnerability. This
    # includes such items as CVEs and GHSAs but also can be URLs into vendor DBs. API users
    # will be able to retrieve items via these IDs in addition to the canonical UUID.
    advisory_ids = models.JSONField(encoder=simplejson.JSONEncoder, default=list)

    # Long description of the vulnerability, including possible remediation steps.
    description = models.TextField(default="")

    # A flag to indicate whether the descrition has been customized by us. This plays a role
    # as to whether the description should be automatically updated based on plugin results.
    description_customized = models.BooleanField(default=False)

    # Explicit remediation steps (optional)
    remediation = models.TextField(default="")

    # A flag to indicate whether the remediation has been customized by us. This plays a role
    # as to whether the remediation should be automatically updated based on plugin results.
    remediation_customized = models.BooleanField(default=False)

    # Internally-generated notes with additional details or specific remediation steps.
    # This is where we may provide business-specific context that the advistories themselves
    # will not have.
    additional_notes = models.TextField(default="")

    # The severity of this vulnerability
    severity = models.CharField(max_length=64, choices=[(t, t.value) for t in Severity])

    # The plugins that have identified this vulnerability
    plugins = models.ManyToManyField(Plugin)

    # The components that have this vulnerability
    components = models.ManyToManyField(Component)

    # Timestamp when this vuln was added to the database
    added = models.DateTimeField(auto_now_add=True)

    # Timestamp when this vuln was last manually modified
    updated = models.DateTimeField(auto_now=True, null=True)

    # Who last modified the item
    updated_by = models.ForeignKey(Group, related_name="%(class)s_updated_by", on_delete=models.SET_NULL, null=True)

    @classmethod
    def most_severe(cls, a, b):
        if ComparableSeverity(b) < ComparableSeverity(a):
            return b
        return a

    def to_dict(self):
        # Build up the components dict for this vuln
        components = {}
        for c in self.components.all():
            if c.name not in components:
                components[c.name] = []
            if c.version not in components[c.name]:
                components[c.name].append(c.version)

        return {
            "id": str(self.vuln_id),
            "advisory_ids": self.advisory_ids,
            "description": self.description,
            "severity": self.severity,
            "remediation": self.remediation,
            "components": components,
            "source_plugins": [p.name for p in self.plugins.all()],
        }


class RepoVulnerabilityScan(models.Model):
    # Externally-facing ID (not PK). This is the canonical ID of the vuln instance within
    # Artemis. This is an ID so that specific vulnerability findings can be referenced by
    # external systems.
    vuln_instance_id = models.UUIDField()

    # The repo that contains this instance of this vulnerability
    repo = models.ForeignKey(Repo, on_delete=models.CASCADE)

    # The branch of this repo that contains this instance of this vulnerability
    ref = models.CharField(max_length=256, null=True)

    # The vulnerability record itself
    vulnerability = models.ForeignKey(Vulnerability, on_delete=models.CASCADE)

    # The scans that identified this vulnerability instance
    scan = models.ManyToManyField(Scan, through="VulnerabilityScanPlugin")

    # Whether this instance of this vulnerability has been resolved. A vulnerability is
    # marked as resolved if a scan of this repository+ref that includes a plugin that can
    # detect this vulnernability fails to find it.
    resolved = models.BooleanField(default=False)

    # The scan that resolved this vuln instance
    resolved_by = models.ForeignKey(Scan, null=True, on_delete=models.SET_NULL, related_name="resolves")

    class Meta:
        app_label = "artemisdb"
        unique_together = ["repo", "vulnerability", "ref"]

    def __str__(self):
        return f"<RepoVulnerabilityScan: {str(self.vuln_instance_id)} {self.repo}, {self.ref}>"

    def to_dict(self, include_resolved_by=True, include_repo=True):
        ret = {
            "id": str(self.vuln_instance_id),
            "resolved": self.resolved,
            "vulnerability": self.vulnerability.to_dict(),
        }

        ret["vulnerability"]["components"] = []
        ret["vulnerability"]["sources"] = []
        for vsp in self.vulnerabilityscanplugin_set.all():
            for component in vsp.components.all():
                c = f"{component.name}-{component.version}"
            if c not in ret["vulnerability"]["components"]:
                ret["vulnerability"]["components"].append(c)
            for source in vsp.source:
                ret["vulnerability"]["sources"] += source["source"]
        ret["vulnerability"]["sources"] = list(set(ret["vulnerability"]["sources"]))  # dedup

        if include_resolved_by:
            ret["resolved_by"] = str(self.resolved_by.scan_id) if self.resolved_by else None
        if include_repo:
            ret["repo"] = self.repo.to_dict()
        return ret


class VulnerabilityScanPlugin(models.Model):
    # The vulnerability instance
    vuln_instance = models.ForeignKey(RepoVulnerabilityScan, on_delete=models.CASCADE)

    # The scan that identified this vulnerability instance
    scan = models.ForeignKey(Scan, on_delete=models.CASCADE)

    # The plugins that have identified this instance of this vulnerability
    plugins = models.ManyToManyField(Plugin)

    # The components found in this scan that have this vulnerability
    components = models.ManyToManyField(Component)

    # The list of sources where this vulnerability was found in this scan
    source = models.JSONField(encoder=simplejson.JSONEncoder, default=list)

    class Meta:
        app_label = "artemisdb"
        unique_together = ["vuln_instance", "scan"]

    def __str__(self):
        return f"<VulnerabilityScanPlugin: {self.vulnerability}, {self.scan}>"

    def to_dict(self):
        return self.vulnerability.to_dict()


class SecretType(models.Model):
    """
    This is a lookup table of secret types supported by secrets plugins
    """

    # Secret type name
    name = models.CharField(max_length=256, unique=True)
