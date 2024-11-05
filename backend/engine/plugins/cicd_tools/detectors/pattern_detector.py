from pathlib import Path
from typing import Callable, Optional

from engine.plugins.cicd_tools.interfaces.detector import Detector, DetectorResult


ValidatorFn = Callable[[Path], bool]


class PatternDetector(Detector):
    def __init__(self, id: str, name: str, pattern: str, validator: Optional[ValidatorFn] = None):
        """
        Detector that searches for a glob pattern and optionally runs a `validator` function on each
        result
        - If `validator` provided, returns `in_use=True` if validator returns true for any path that
          matches the pattern
        - If `validator` not provided, returns `in_use=True` if pattern finds anything
        """
        self.id = id
        self.name = name
        self.pattern = pattern
        self.validator = validator

    def check(self, path: str) -> DetectorResult:
        result: DetectorResult = {
            "id": self.id,
            "name": self.name,
            "configs": [],
            "in_use": False,
            "debug": [],
            "alerts": [],
            "errors": [],
        }

        matches = Path(path).rglob(self.pattern)

        if self.validator:
            for match in matches:
                validator_result = self.validator(match)

                if validator_result:
                    result["in_use"] = True
                    result["configs"].append(str(match.relative_to(path)))
        else:
            for match in matches:
                result["in_use"] = True
                result["configs"].append(str(match.relative_to(path)))

        return result
