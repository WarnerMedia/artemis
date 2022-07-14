import logging
import os
import sys

DEFAULT_LOG_LEVEL = "INFO"
LOG_LEVEL = os.environ.get("ARTEMIS_LOG_LEVEL", DEFAULT_LOG_LEVEL).upper()

LEVEL_MAP = {
    "CRITICAL": logging.CRITICAL,
    "ERROR": logging.ERROR,
    "WARNING": logging.WARNING,
    "INFO": logging.INFO,
    "DEBUG": logging.DEBUG,
    "NOTSET": logging.NOTSET,
}


class Logger:
    def __new__(cls, name: str, level=LOG_LEVEL):
        log = logging.getLogger(name.strip())
        if not log.hasHandlers():
            console = logging.StreamHandler(sys.stderr)
            formatter = logging.Formatter(
                fmt="%(asctime)s %(levelname)-8s [%(name)s] %(message)s", datefmt="[%Y-%m-%dT%H:%M:%S%z]"
            )
            console.setFormatter(formatter)
            log.addHandler(console)
        log.setLevel(LEVEL_MAP.get(level, DEFAULT_LOG_LEVEL))
        return log
