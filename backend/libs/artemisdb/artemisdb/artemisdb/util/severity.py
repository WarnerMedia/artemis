from artemisdb.artemisdb.consts import Severity

SEVERITY_ORDER = [
    Severity.CRITICAL.value,
    Severity.HIGH.value,
    Severity.MEDIUM.value,
    Severity.LOW.value,
    Severity.NEGLIGIBLE.value,
    Severity.NONE.value,
]


class ComparableSeverity:
    def __init__(self, severity: str) -> None:
        self._weight = 0
        for sev in SEVERITY_ORDER:
            if severity == sev:
                break
            self._weight += 1

    def __lt__(self, o: object) -> bool:
        return self._weight < o._weight
