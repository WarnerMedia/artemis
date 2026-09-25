from pathlib import Path
import subprocess
from typing import Iterator

from engine.plugins.lib import utils

from .report import Report
from .results import Severity, StaticAnalysisFinding, result_stream

LOG = utils.setup_logging("zizmor")

PLUGIN_DIR = Path(__file__).parent.absolute()

# Map of Zizmor severities to Artemis.
SEVERITIES: dict[str, Severity] = {
    "High": "high",
    "Medium": "medium",
    "Low": "low",
    "Informational": "negligible",
    "Unknown": "negligible",
}


def run(path: str) -> Iterator[StaticAnalysisFinding]:
    process = subprocess.run(
        [
            "zizmor",
            "--format=json-v1",
            "--color=never",
            "--quiet",
            "--offline",
            "--min-confidence=medium",  # Filter out low-confidence findings.
            f"--config={PLUGIN_DIR / 'zizmor.yml'}",
            "--",
            path,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    # See: https://docs.zizmor.sh/usage/#exit-codes
    if process.returncode == 0:
        LOG.info("No issues found.")
        yield from []
    elif process.returncode == 1:
        raise Exception(f"Scan error: {process.stderr.decode('utf-8')}")
    elif process.returncode == 3:
        LOG.info("No input files found.")
        yield from []
    elif 10 <= process.returncode <= 14:
        # Exit code 10 was used in older versions of Zizmor to represent "unknown"-level findings.
        # We include it in case it becomes used again in the future.
        yield from parse_scan(Report.model_validate_json(process.stdout.decode("utf-8")), path)
    else:
        raise Exception(f"Unexpected exit code from zizmor: {process.returncode}: {process.stderr.decode('utf-8')}")


def parse_scan(data: Report, path: str) -> Iterator[StaticAnalysisFinding]:
    for finding in data.root:
        # If there are multiple locations, only the final one is the finding.
        # The rest just provide context (i.e., which job the finding is in).
        if len(finding.locations) > 0:
            loc = finding.locations[-1]
            yield StaticAnalysisFinding(
                filename=loc.symbolic.key.local.given_path.removeprefix(path),
                severity=SEVERITIES.get(finding.determinations.severity, "negligible"),
                message=loc.symbolic.annotation,
                line=loc.concrete.location.start_point.row + 1,
                type=finding.desc,
            )


def main():
    args = utils.parse_args()
    with result_stream() as results:
        for i in run(args.path):
            results.report(i)


if __name__ == "__main__":
    main()
