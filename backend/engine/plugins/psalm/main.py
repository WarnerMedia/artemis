import json
import os
import subprocess
from engine.plugins.lib import utils
from sarif import loader
import glob

SEVERITY_MAP = {"note": "low", "error": "high", "warning": "medium"}
logger = utils.setup_logging("psalm")


def main():
    """
    Main plugin execution
    """
    args = utils.parse_args()

    lock_files = find_lockfiles(args.path)
    errors = []
    plugin_results = []

    if len(lock_files) == 0:
        logger.warning("No composer.lock files found")
    else:
        for file in lock_files:
            result = run_psalm(file)
            errors.extend(result[0])
            plugin_results.extend(result[1])

    print(
        json.dumps(
            {
                "success": len(plugin_results) == 0
                and len(errors) == 0,  # True if scan found no issues or nothing to scan. False otherwise.
                "truncated": False,  # This should always be set to False. Historically, this boolean would be set to True to indicate that more findings were generated than could fit within the 400kb DynamoDB item size limit. This is no longer necessary.
                "details": plugin_results,  # List of detailed results. Format is determined by plugin type.
                "errors": errors,  # List of error strings generated during plugin execution.
            }
        )
    )


def run_psalm(path: str) -> tuple[list[str], list[dict]]:
    """
    Runs psalm in a directory with a composer.lock file.
    Returns the errors and a list of results
    """
    # Install PHP dependencies before running psalm
    process = subprocess.run(
        ["composer", "install"],
        cwd=path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
    )

    process = subprocess.run(
        ["psalm", "--no-cache", "--taint-analysis", "--output-format=sarif", "--report=report.sarif"],
        cwd=path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
        text=True,
    )

    return parse_results(process.returncode, path, process.stderr)


def parse_results(returncode: int, path: str, stderr: str) -> tuple[list[str], list[dict]]:
    plugin_results = []
    errors = []
    if returncode == 1:
        errors.append(stderr)

    try:
        sarif_data = loader.load_sarif_file(f"{path}/report.sarif")
        records = sarif_data.get_records()
    except Exception as e:
        records = []
        errors.append(f"Unable to load SARIF file. Error: {e}")

    for result in records:
        plugin_results.append(
            {
                "filename": f"{path}/{result['Location']}",
                "line": result["Line"],
                "message": result["Description"],
                "severity": SEVERITY_MAP[result["Severity"]],
                "type": "psalm",
            }
        )

    return errors, plugin_results


def find_lockfiles(project_dir: str) -> list[str]:
    """
    Return a list of directories with a composer.lock file
    """
    lock_files = glob.glob(f"{project_dir}/**/composer.lock", recursive=True)
    return [os.path.dirname(file) for file in lock_files]


if __name__ == "__main__":
    main()
