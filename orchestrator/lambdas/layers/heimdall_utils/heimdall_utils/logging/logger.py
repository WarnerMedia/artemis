import logging
import sys
from typing import Dict, Any, Iterable, IO

from heimdall_utils.logging.formatter import BaseFormatter


class HeimdallLogger(logging.Logger):
    """
    Logger for Heimdall Lambdas
    """

    def __init__(
        self,
        name: str,
        level: int,
        formatter: BaseFormatter,
        stream: IO = sys.stderr,
        **kwargs,
    ) -> None:
        super().__init__(name, level)
        self._formatter = formatter
        self._setup_logger(kwargs, stream)

    def _setup_logger(self, formatter_fields, stream):
        """
        Add the required handlers for the Logger

        The AWS Lambda environment starts with a handler already configured
        so remove it to replace it with our own.
        """
        self._formatter.add_keys(**formatter_fields)

        for handler in self.handlers:
            self.removeHandler(handler)

        console = logging.StreamHandler(stream)
        console.setFormatter(self._formatter)
        self.addHandler(console)

    def add_keys(self, **kwargs) -> None:
        self._formatter.add_keys(**kwargs)

    def get_current_keys(self) -> Dict[str, Any]:
        return self._formatter.get_current_keys()

    def remove_keys(self, keys: Iterable[str]) -> None:
        self._formatter.remove_keys(keys)

    def reset_log_format(self) -> None:
        """
        Reset the Log format to the default state
        """
        self._formatter.reset_log_format()
