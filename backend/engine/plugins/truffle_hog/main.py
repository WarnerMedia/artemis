import json
import subprocess
import uuid

from copy import copy
from typing import Optional

from engine.plugins.lib import utils
from engine.plugins.lib.common.system.allowlist import SystemAllowList
from engine.plugins.lib.secrets_common.enums import SecretValidity

ENDS = {"lock", "lock.json", "DEPS"}
STARTS = {"vendor"}


log = utils.setup_logging("tuffle_hog")


def main(in_args=None):
    args = utils.parse_args(
        in_args,
        extra_args=[
            [
                ["--rules"],
                {"dest": "rules", "type": str, "nargs": "?", "default": "/srv/engine/plugins/truffle_hog/regexes.json"},
            ]
        ],
    )

    scan_results = run_security_checker(args.path, depth=args.engine_vars.get("depth"), rules=args.rules)
    cleaned_results = scrub_results(scan_results, args.path)

    # Print the results to stdout
    print(
        json.dumps(
            {
                "success": not cleaned_results["results"],
                "details": cleaned_results["results"],
                "event_info": cleaned_results["event_info"],
            }
        )
    )


def secret_type(reason: str) -> str:
    if reason.startswith("SSH ") or reason.startswith("RSA ") or reason.startswith("PGP "):
        return "ssh"
    elif reason.startswith("AWS "):
        return "aws"
    elif reason.startswith("MongoDB "):
        return "mongo"
    elif reason.startswith("PostgreSQL "):
        return "postgres"
    elif reason.startswith("Google"):
        return "google"
    elif reason.startswith("Redis "):
        return "redis"
    elif reason.startswith("HTTP ") or reason.startswith("HTTPS "):
        return "urlauth"
    elif reason.startswith("Slack "):
        return "slack"
    else:
        # Types must be all lowercase
        return reason.lower()


def commit_author(scan_path: str, commit: str) -> tuple:
    author = "Unknown author"
    timestamp = ""

    r = subprocess.run(
        ["git", "show", "-s", "--date=iso-strict-local", """--format=%an <%ae>,%ad""", commit],
        cwd=scan_path,
        capture_output=True,
        check=False,
        env={"TZ": "UTC"},
    )
    if r.returncode == 0:
        split = r.stdout.decode("utf-8").strip().split(",")
        author = split[0]
        timestamp = split[1]

    return author, timestamp


def line_number(diff: str) -> int:
    try:
        header = diff.split("\n")[0]
        added = header.split()[2]
        line = int(added.split(",")[0].strip("+"))
        if line == 0:
            # Special case for adding to empty file
            line = 1
        return line
    except (ValueError, IndexError):
        return -1


def scrub_results(scan_results: list, scan_path: str) -> dict:
    cleaned_records = []
    event_info = {}
    allowlist = SystemAllowList(al_type="secret")
    for record in scan_results:
        add_to_list = True
        for prefix in STARTS:
            if record["path"].startswith(prefix):
                add_to_list = False
        for suffix in ENDS:
            if record["path"].endswith(suffix):
                add_to_list = False
        if add_to_list:
            item_id = str(uuid.uuid4())
            matches = [s.strip() for s in record["stringsFound"]]
            for match in copy(matches):
                # Check all the secrets that were matched and remove the ones that should be ignored
                if allowlist.ignore_secret(record["path"], match):
                    matches.remove(match)
            if not matches:
                # No matches remaining so skip the finding altogether
                log.info("Skipping secret that matched system allowlist in file '%s'", record["path"])
                continue
            author, timestamp = commit_author(scan_path, record["commitHash"])
            record_json = {
                "id": item_id,
                "filename": record["path"],
                "line": line_number(record["diff"]),
                "commit": record["commitHash"],
                "type": secret_type(record["reason"]),
                "author": author,
                "author-timestamp": timestamp,
                "validity": SecretValidity.UNKNOWN,
            }
            event_info[item_id] = {"match": matches, "type": record_json["type"]}
            cleaned_records.append(record_json)
    return {"results": cleaned_records, "event_info": event_info}


def run_security_checker(scan_path: str, depth=None, rules: Optional[str] = None) -> list:
    log.info("Running trufflehog (depth limit: %s)", depth)
    if depth:
        cmd = [
            "trufflehog",
            "--regex",
            "--json",
            "--entropy",
            "FALSE",
            "--max_depth",
            str(depth),
            "--rules",
            rules,
            ".",
        ]
    else:
        cmd = ["trufflehog", "--regex", "--json", "--entropy", "FALSE", "--rules", rules, "."]
    proc_results = subprocess.run(cmd, cwd=scan_path, capture_output=True, check=False)
    if proc_results.stderr:
        log.error(proc_results.stderr.decode("utf-8"))
    lines = proc_results.stdout.decode("utf-8").split("\n")
    del lines[-1]
    results = [json.loads(line) for line in lines]
    return results


if __name__ == "__main__":
    main()
