import json
import subprocess
from engine.plugins.lib import utils

logger = utils.setup_logging("tflint")


def main():
    """
    Main plugin execution
    """
    args = utils.parse_args()
    output = run_psalm(args.path)

    print(
        json.dumps(
            {
                "success": True,  # True if scan found no issues or nothing to scan. False otherwise.
                "truncated": False,  # This should always be set to False. Historically, this boolean would be set to True to indicate that more findings were generated than could fit within the 400kb DynamoDB item size limit. This is no longer necessary.
                "details": [],  # List of detailed results. Format is determined by plugin type.
                "errors": ["hello world"],  # List of error strings generated during plugin execution.
            }
        )
    )


def run_psalm(path: str):
    process = subprocess.run(
        ["psalm", "--no-cache", "--taint-analysis", "--output-format=sarif"],
        cwd=path,
        capture_output=True,
        check=False,
    )
    print(process.stdout)
    print(process.stderr)
    return process


if __name__ == "__main__":
    main()
