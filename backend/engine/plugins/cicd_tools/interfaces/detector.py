from typing import TypedDict


class DetectorResult(TypedDict):
    id: str
    name: str
    configs: list[str]
    in_use: bool

    debug: list[str]
    alerts: list[str]
    errors: list[str]


class Detector:
    def check(self, path: str) -> DetectorResult:
        raise NotImplementedError()
