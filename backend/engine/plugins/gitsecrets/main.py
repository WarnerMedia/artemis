import json
import re
import subprocess
import uuid
from collections import namedtuple
from datetime import datetime, timezone

from engine.plugins.gitsecrets.secrets_processor import SecretProcessor
from engine.plugins.lib import utils
from engine.plugins.lib.common.system.allowlist import SystemAllowList
from engine.plugins.lib.secrets_common.enums import SecretValidity

log = utils.setup_logging("gitsecrets")

GIT_SECRETS_RESULT = namedtuple("git_secrets_result", ["scan_results", "event_info"])
GIT_BLAME_RESULT = namedtuple("git_blame_result", ["name", "commit", "timestamp"])


def main():
    args = utils.parse_args()

    secrets_results = run_git_secrets(args.path)

    # Print the results to stdout
    print(
        json.dumps(
            {
                "success": not secrets_results.scan_results,
                "details": secrets_results.scan_results or [],
                "truncated": False,
                "event_info": secrets_results.event_info,
            }
        )
    )


def run_git_secrets(scan_path: str) -> GIT_SECRETS_RESULT:
    log.info("Running git-secrets")
    r = execute_git_secrets(scan_path)

    if not scan_path.endswith("/"):
        scan_path += "/"

    results = []
    event_info = {}
    if r.returncode != 1:
        return GIT_SECRETS_RESULT(results, event_info)

    allowlist = SystemAllowList(al_type="secret")

    for line in re.findall(".+:\\d+:.+", decode_response(r.stderr)):
        processor = SecretProcessor(base_path=scan_path)
        if not processor.process_response(line):
            continue
        if allowlist.ignore_secret(processor.filename, processor.secret):
            log.info("Skipping secret that matched system allowlist in file '%s'", processor.filename)
            continue
        blame_result = blame(scan_path, processor.filename, processor.line_number)
        item_id = str(uuid.uuid4())
        item = {
            "id": item_id,
            "filename": processor.filename,
            "line": processor.line_number,
            "commit": blame_result.commit,
            "type": processor.secret_type,
            "author": blame_result.name,
            "author-timestamp": blame_result.timestamp,
            "validity": SecretValidity.UNKNOWN,
        }
        results.append(item)
        event_info[item_id] = {"match": processor.secret, "type": item["type"]}

    return GIT_SECRETS_RESULT(results, event_info)


def execute_git_secrets(scan_path):
    return subprocess.run(["git-secrets", "--scan", "--recursive", scan_path], capture_output=True, check=False)


def decode_response(response_bytes):
    return response_bytes.decode("utf-8", "ignore")


def blame(scan_path: str, file: str, line_num: int) -> GIT_BLAME_RESULT:
    name = "Unknown Author"
    email = "<>"
    commit = "HEAD"
    timestamp = ""

    # Run 'git blame' to get the name of who committed the flagged line
    r = execute_git_blame(line_num, file, scan_path)
    if r.returncode != 0:
        return GIT_BLAME_RESULT(name, commit, timestamp)
    lines = decode_response(r.stdout).split("\n")
    commit = lines[0].split()[0]
    for line in lines:
        if line.startswith("author "):
            split = line.split(maxsplit=1)
            if len(split) > 1:
                name = split[1]
        elif line.startswith("author-mail "):
            split = line.split(maxsplit=1)
            if len(split) > 1:
                email = split[1]
        elif line.startswith("author-time "):
            split = line.split(maxsplit=1)
            if len(split) > 1:
                timestamp = datetime.fromtimestamp(int(split[1]), timezone.utc).isoformat(timespec="microseconds")
    return GIT_BLAME_RESULT(f"{name} {email}", commit, timestamp)


def execute_git_blame(line_num, file, scan_path):
    return subprocess.run(
        ["git", "blame", "-p", "-L", "%d,%d" % (line_num, line_num), "--", file],
        capture_output=True,
        cwd=scan_path,
        check=False,
    )


if __name__ == "__main__":
    main()
