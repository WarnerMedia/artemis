from contextlib import contextmanager
from typing import Iterator, Literal

from pydantic import BaseModel

# Plugin result model.

# Note: This is a generic experimental library to be eventually moved into
# a separate plugin SDK for streaming results.


Severity = Literal["critical", "high", "medium", "low", "negligible"]


class StaticAnalysisFinding(BaseModel):
    filename: str
    severity: Severity
    message: str
    line: int
    type: str


class PluginResults(BaseModel):
    success: bool = True
    truncated: bool = False
    details: list[StaticAnalysisFinding] = []
    errors: list[str] = []

    def report(self, finding: StaticAnalysisFinding) -> None:
        """Report a finding."""
        self.details.append(finding)

    def error(self, message: str) -> None:
        """Report an error."""
        self.success = False
        self.errors.append(message)


@contextmanager
def result_stream() -> Iterator[PluginResults]:
    """
    Open a stream of plugin results.

    This ensures that the plugin results are always written.
    If an Exception is raised in the context manager block, it will be reported
    as an error.
    """
    results = PluginResults()
    try:
        yield results
    except Exception as ex:
        results.error(str(ex))
    finally:
        print(results.model_dump_json())
