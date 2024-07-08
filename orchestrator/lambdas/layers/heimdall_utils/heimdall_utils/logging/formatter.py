import logging
import json
from abc import ABCMeta, abstractmethod
from typing import Dict, Any, Iterable, Optional

# Log Attributes: https://docs.python.org/3/library/logging.html#logrecord-attributes
RESERVED_ATTRIBUTES = (
    "asctime",
    "args",
    "created",
    "level",
    "exc_info",
    "exc_text",
    "filename",
    "funcName",
    "levelname",
    "levelno",
    "lineno",
    "location",
    "module",
    "msg",
    "msecs",
    "name",
    "pathname",
    "process",
    "processName",
    "stack_info",
    "relativeCreated",
    "thread",
    "threadName",
    "timestamp",
)


class BaseFormatter(logging.Formatter, metaclass=ABCMeta):
    @abstractmethod
    def add_keys(self, **kwargs) -> None:
        raise NotImplementedError()

    @abstractmethod
    def get_current_keys(self) -> Dict[str, Any]:
        raise NotImplementedError()

    @abstractmethod
    def remove_keys(self, keys: Iterable[str]) -> None:
        raise NotImplementedError()

    @abstractmethod
    def reset_log_format(self) -> None:
        raise NotImplementedError()


class JsonFormatter(BaseFormatter):
    """
    JSON Formatter for Heimdall Lambdas

    Formats the log message as a JSON encoded string.

    Parameters:
        datefmt (str): String directives (strftime) to format log timestamp.
    """

    def __init__(
        self,
        datefmt: Optional[str] = None,
    ) -> None:
        super().__init__(datefmt=datefmt)

        self.log_format = self._get_default_format()

    def add_keys(self, **kwargs) -> None:
        self.log_format.update(kwargs)

    def get_current_keys(self) -> Dict[str, Any]:
        return self.log_format.keys()

    def remove_keys(self, keys: Iterable[str]) -> None:

        for key in keys:
            self.log_format.pop(key, None)

    def reset_log_format(self) -> None:
        self.log_format = self._get_default_format()

    def format(self, record: logging.LogRecord) -> str:
        """
        Format the specified log record as a structured JSON string.

        TODO: stack_trace data in Logger.exception() should be added to the log message
        TODO:  Extra attributes added to the Logger should be added to the log message
                eg. Logger.info("msg", extra={"status": "build"})

        """
        record.asctime = self.formatTime(record, self.datefmt)
        record_dict = record.__dict__.copy()

        formatted_dict = {}
        for key, value in self.log_format.items():
            if value and key in RESERVED_ATTRIBUTES:
                formatted_dict[key] = value % record_dict
            else:
                formatted_dict[key] = value

        formatted_dict["message"] = record.getMessage()
        formatted_dict = self._remove_null_keys(formatted_dict)

        return json.dumps(formatted_dict, default=str)

    def _get_default_format(self) -> Dict[str, Any]:
        return {
            "level": "%(levelname)s",
            "location": "%(funcName)s:%(lineno)d",
            "timestamp": "%(asctime)s",
            "message": None,
        }

    def _remove_null_keys(self, log_dict: Dict[str, Any]) -> Dict[str, Any]:
        """Remove keys that have Null values from the log_dict"""
        return {k: v for k, v in log_dict.items() if v is not None}
