from pathlib import Path
from typing import Callable, Optional

from engine.plugins.cicd_tools.interfaces.detector import Detector, DetectorResult


ValidatorFn = Callable[[Path], bool]


class PatternDetector(Detector):
    def __init__(self, id: str, name: str, patterns: list[str], validator: Optional[ValidatorFn] = None):
        """
        Detector that searches for a glob pattern and optionally runs a `validator` function on each
        result
        - If `validator` provided, returns `in_use=True` if validator returns true for any path that
          matches the pattern
        - If `validator` not provided, returns `in_use=True` if pattern finds anything
        """
        self.id = id
        self.name = name
        self.patterns = patterns
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

        matches = self._get_matches(path)

        if self.validator:
            for match in matches:
                validator_result = self.validator(match)

                if validator_result:
                    result["in_use"] = True
                    result["configs"].append({"path": str(match.relative_to(path))})
        else:
            for match in matches:
                result["in_use"] = True
                result["configs"].append({"path": str(match.relative_to(path))})

        return result

    def _get_matches(self, path: str) -> list[Path]:
        result = []
        base = Path(path)

        for pattern in self.patterns:
            result.extend(base.rglob(pattern))

        return result
