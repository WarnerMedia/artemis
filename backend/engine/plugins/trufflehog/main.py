import json
import subprocess
import uuid

from engine.plugins.lib import utils
from engine.plugins.lib.common.system.allowlist import SystemAllowList

ENDS = {"lock", "lock.json", "DEPS"}
STARTS = {"vendor"}


log = utils.setup_logging("trufflehog")


def main(in_args=None):
    args = utils.parse_args(
        in_args,
    )

    scan_results = run_security_checker(args.path, depth=args.engine_vars.get("depth"))
    cleaned_results = scrub_results(scan_results)

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


def get_source_metadata(finding):
    return finding.get("SourceMetadata", {}).get("Data", {}).get("Git", None) 


def get_finding_type(finding):
    return finding.get("DetectorName").lower()


def scrub_results(scan_results: list) -> list:
    cleaned_records = []
    event_info = {}
    allowlist = SystemAllowList(al_type="secret")

    for record in scan_results:
        add_to_list = True
        source_metadata = get_source_metadata(record)
        path = source_metadata.get("file")

        for prefix in STARTS:
            if path.startswith(prefix):
                add_to_list = False
        for suffix in ENDS:
            if path.endswith(suffix):
                add_to_list = False

        if add_to_list:
            item_id = str(uuid.uuid4())
            finding_raw = record.get("Raw")

            if allowlist.ignore_secret(path, finding_raw):
                # No matches remaining so skip the finding altogether
                log.info("Skipping secret that matched system allowlist in file '%s'", record["path"])
                continue

            record_json = {
                "id": item_id,
                "filename": path,
                "line": source_metadata.get("line"),
                "commit": source_metadata.get("commit"),
                "type": get_finding_type(record),
                "author": source_metadata.get("email"),
                "author-timestamp": source_metadata.get("timestamp"),
            }

            event_info[item_id] = {"match": [ finding_raw ], "type": record_json["type"]}
            cleaned_records.append(record_json)

    return {"results": cleaned_records, "event_info": event_info}


def run_security_checker(scan_path: str, depth=None) -> list:
    log.info("Running trufflehog (depth limit: %s)", depth)

    if depth:
        cmd = [
            "trufflehog",
            "git",
            "--json",
            "--no-update",
            "--max_depth",
            str(depth),
            "file://.",
        ]
    else:
        cmd = ["trufflehog", "git", "--json", "--no-update", "file://."]

    proc_results = subprocess.run(cmd, cwd=scan_path, capture_output=True, check=False)

    if proc_results.stderr:
        log.error(proc_results.stderr.decode("utf-8"))

    lines = proc_results.stdout.decode("utf-8").split("\n")

    del lines[-1]
    results = [json.loads(line) for line in lines]

    return results


if __name__ == "__main__":
    main()
