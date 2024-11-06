from abc import ABC, abstractmethod
from typing import TypedDict


class DetectorResult(TypedDict):
    id: str
    name: str
    configs: list[str]
    in_use: bool

    debug: list[str]
    alerts: list[str]
    errors: list[str]


class Detector(ABC):
    @abstractmethod
    def check(self, path: str) -> DetectorResult:
        pass
