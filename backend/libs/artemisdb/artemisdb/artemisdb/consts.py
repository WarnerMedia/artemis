from enum import Enum


class ScanStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ERROR = "error"
    TERMINATED = "terminated"


class PluginType(Enum):
    INVENTORY = "inventory"
    VULN = "vulnerability"
    SECRETS = "secrets"
    STATIC_ANALYSIS = "static_analysis"


class AllowListType(Enum):
    SECRET = "secret"
    SECRET_RAW = "secret_raw"
    VULN = "vulnerability"
    VULN_RAW = "vulnerability_raw"
    STATIC_ANALYSIS = "static_analysis"


class EngineState(Enum):
    RUNNING = "running"
    SHUTDOWN_REQUESTED = "shutdown_requested"
    SHUTDOWN = "shutdown"
    TERMINATED = "terminated"


class ReportStatus(Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    ERROR = "error"
    TERMINATED = "terminated"


class ReportType(Enum):
    PDF = "pdf"


class RiskClassification(Enum):
    PRIORITY = "priority"
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "moderate"
    LOW = "low"


class Severity(Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    NEGLIGIBLE = "negligible"
    NONE = ""


DEFAULT_PAGE_SIZE = 20

MAX_REASON_LENGTH = 512

NOT_RUNNING_STATUSES = [
    ScanStatus.COMPLETED.value,
    ScanStatus.FAILED.value,
    ScanStatus.ERROR.value,
    ScanStatus.TERMINATED.value,
]


class SystemAllowListType(Enum):
    SECRET = "secret"
