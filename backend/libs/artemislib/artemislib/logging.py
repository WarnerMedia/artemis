import os
import sys
import json
from logging import (
    Formatter,
    LogRecord,
    StreamHandler,
    ERROR,
    CRITICAL,
    WARNING,
    INFO,
    DEBUG,
    NOTSET,
    getLogger,
    getLogRecordFactory,
    setLogRecordFactory,
)
from functools import wraps

from typing import Dict, Any, cast

DEFAULT_LOG_LEVEL = "INFO"
LOG_LEVEL = os.environ.get("ARTEMIS_LOG_LEVEL", DEFAULT_LOG_LEVEL).upper()
LEVEL_MAP = {"CRITICAL": CRITICAL, "ERROR": ERROR, "WARNING": WARNING, "INFO": INFO, "DEBUG": DEBUG, "NOTSET": NOTSET}


class JSONFormatter(Formatter):
    """
    A custom Logging Formatter that converts a LogRecord to a JSON encoded string.
    """

    def __init__(self):
        super().__init__()
        self.reserved_attrs = set(LogRecord("", 0, "", 0, "", (), None).__dict__.keys())

    def format(self, record: LogRecord) -> str:
        message = record.__dict__.copy()
        log_record = {
            "timestamp": self.formatTime(record, self.datefmt),
            "level": record.levelname,
            "location": f"{record.funcName}:{record.lineno}",
            "message": record.getMessage(),
        }
        # Exclude reserved attributes and Add additional_fields
        for key, value in message.items():
            if key not in self.reserved_attrs and value:
                log_record[key] = value

        # Format Exception
        if record.exc_info and record.exc_text is None:
            record.exc_text = self.formatException(record.exc_info)

        if record.exc_text:
            log_record["exc_info"] = record.exc_text

        if record.stack_info:
            log_record["stack_info"] = self.formatStack(record.stack_info)

        log_record = self._prune_null_fields(log_record)
        return json.dumps(log_record)

    def _prune_null_fields(self, records: Dict[str, Any]) -> Dict[str, Any]:
        """
        Remove any key with a Null value
        """
        return {k: v for k, v in records.items() if v is not None}


class LogRecordFactory:
    """
    A custom Factory class to be used when instantiating a LogRecord.

    LogRecord instances are created every time something is logged. They
    contain all the information for the event being logged. This custom
    factory, adds the ability to add and remove fields that should be visible
    across all Logs
    """

    def __init__(self):
        self.extra_fields = {}

    def __call__(self, *args, **kwargs) -> LogRecord:
        record = LogRecord(*args, **kwargs)
        for key, value in self.extra_fields.items():
            setattr(record, key, value)
        return record

    def add_fields(self, **kwargs):
        self.extra_fields.update(kwargs)

    def remove_fields(self, *args):
        for key in args:
            self.extra_fields.pop(key, None)

    def reset_fields(self):
        self.extra_fields = {}

    def get_current_fields(self) -> Dict[str, Any]:
        return self.extra_fields


# Update the default Log record factory
setLogRecordFactory(LogRecordFactory())


class Logger:
    """
    Factory Class for generating new Loggers

    Provides options to update log fields that that should persist across all loggers
    """

    def __new__(cls, name: str, level=LOG_LEVEL, stream=sys.stdout):
        log = getLogger(name.strip())
        if not log.hasHandlers():
            json_formatter = JSONFormatter()
            stdout_handler = StreamHandler(stream)
            stdout_handler.setFormatter(json_formatter)
            log.addHandler(stdout_handler)

        log.setLevel(LEVEL_MAP.get(level, DEFAULT_LOG_LEVEL))
        return log

    @classmethod
    def add_fields(cls, **kwargs):
        record_factory = cls._get_record_factory()
        record_factory.add_fields(**kwargs)

    @classmethod
    def remove_fields(cls, *args):
        record_factory = cls._get_record_factory()
        record_factory.remove_fields(*args)

    @classmethod
    def reset_fields(cls):
        record_factory = cls._get_record_factory()
        record_factory.reset_fields()

    @classmethod
    def _get_record_factory(cls) -> LogRecordFactory:
        return cast(LogRecordFactory, getLogRecordFactory())

    @classmethod
    def add_lambda_context(cls, handler):
        """
        Inject lambda context to Log fields
        """

        @wraps(handler)
        def wrapper(event, context, *args, **kwargs):
            cls.add_fields(
                function_arn=context.invoked_function_arn,
                function_name=context.function_name,
                function_memory_size=context.memory_limit_in_mb,
                function_request_id=context.aws_request_id,
                function_version=context.function_version,
                api_gateway_request_id=event.get("requestContext", {}).get("requestID"),
            )
            return handler(event, context, *args, **kwargs)

        return wrapper


def inject_plugin_logs(plugin_logs: str, plugin_name: str):
    """
    Parses the log messages from an Artemis plugin and Logs each line to stdout
    """
    logger = Logger(plugin_name)
    logs = plugin_logs.split("\n")
    for line in logs:
        try:
            log_entry = json.loads(line)
            log_message = log_entry.get("message", "")
            log_level = log_entry.get("level", "INFO").upper()

            if log_level == "ERROR":
                logger.error(log_message)
            elif log_level == "WARNING":
                logger.warning(log_message)
            else:
                logger.info(log_message)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse log line: {line}")


# TODO: Handle uncaught exceptions with sys.excepthook
