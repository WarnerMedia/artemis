import json
import subprocess
import uuid

from engine.plugins.trufflehog.detectors import verified_detectors_allowlist, inactiveable_detectors
from engine.plugins.trufflehog.type_normalization import normalize_type
from engine.plugins.lib import utils
from engine.plugins.lib.common.system.allowlist import SystemAllowList
from engine.plugins.lib.secrets_common.enums import SecretValidity

ENDS = {"lock", "lock.json", "DEPS"}
STARTS = {"vendor"}

log = utils.setup_logging("trufflehog")

verified_detectors_allowlist_str = ",".join(verified_detectors_allowlist)
inactiveable_detectors_set = set(inactiveable_detectors)


def main(in_args=None):
    args = utils.parse_args(
        in_args,
    )

    error_dict = {"errors": [], "alerts": [], "debug": []}
    depth = args.engine_vars.get("depth")

    verified_results = run_security_checker(args.path, error_dict, verified=True, depth=depth)
    unverified_results = run_security_checker(args.path, error_dict, verified=False, depth=depth)
    scan_results = verified_results + unverified_results

    cleaned_results = scrub_results(scan_results, error_dict)

    # Print the results to stdout
    print(
        json.dumps(
            {
                "success": not cleaned_results["results"],
                "details": cleaned_results["results"],
                "event_info": cleaned_results["event_info"],
                "errors": error_dict["errors"],
                "alerts": error_dict["alerts"],
                "debug": error_dict["debug"],
            }
        )
    )


def get_source_metadata(finding):
    return finding.get("SourceMetadata", {}).get("Data", {}).get("Git", None)


def get_finding_type(finding):
    finding_type = finding.get("DetectorName")

    return normalize_type(finding_type)


def get_validity(finding):
    # Trufflehog results have two fields relevant to validity determination: `Verified` and
    # `VerificationError`.
    # - `Verified` is just a boolean. If it's True, we return `active`
    # - `VerificationError` occurs when something unexpected happens during verification. If it
    #   exists, we return `unknown`
    # - If `Verified` is False and `VerificationError` is None, we return `inactive`
    #
    # NOTE: Trufflehog's handling of errors is not exhaustive. It will return with
    # `VerificationError` in some cases where we could confidently mark a finding `inactive`.
    # Handling these would be on a detector by detector basis, which seems like too much complexity
    # for the benefit it gives us.
    verified = finding.get("Verified")

    if verified == True:
        return SecretValidity.ACTIVE
    else:
        detector = finding.get("DetectorName")

        if detector in inactiveable_detectors_set and "VerificationError" not in finding:
            return SecretValidity.INACTIVE
        else:
            return SecretValidity.UNKNOWN


def scrub_results(scan_results: list, error_dict: dict) -> dict:
    cleaned_records = []
    event_info = {}
    allowlist = SystemAllowList(al_type="secret")

    for record in scan_results:
        add_to_list = True
        source_metadata = get_source_metadata(record)

        if not source_metadata:
            source_metadata_str = json.dumps(record.get("SourceMetadata", "No SourceMetadata"))
            error_dict["errors"].append(f"Could not get SourceMetadata of record. Metadata is: {source_metadata_str}")
            continue

        path = source_metadata.get("file")
        line = source_metadata.get("line")

        if path:
            for prefix in STARTS:
                if path.startswith(prefix):
                    add_to_list = False
            for suffix in ENDS:
                if path.endswith(suffix):
                    add_to_list = False
        else:
            # `path` can be None if finding is from a commit message, since the finding's
            # `source_metadata` will not have a "file" property.
            # - Set `path` to "commit_message" to follow the pattern for non-file secrets in the
            #   `ghas_secrets` plugin
            # - Set `line` to 0, as it will otherwise refer to the line in the commit message
            #   instead of the line of code
            path = "commit_message"
            line = 0

        if add_to_list:
            item_id = str(uuid.uuid4())
            finding_raw = record.get("Raw")

            if allowlist.ignore_secret(path, finding_raw):
                # No matches remaining so skip the finding altogether
                log.info("Skipping secret that matched system allowlist in file '%s'", path)
                continue

            record_json = {
                "id": item_id,
                "filename": path,
                "line": line,
                "commit": source_metadata.get("commit"),
                "type": get_finding_type(record),
                "author": source_metadata.get("email"),
                "author-timestamp": source_metadata.get("timestamp"),
                "validity": get_validity(record),
            }

            event_info[item_id] = {"match": [finding_raw], "type": record_json["type"]}
            cleaned_records.append(record_json)

    return {"results": cleaned_records, "event_info": event_info}


def run_security_checker(scan_path: str, error_dict: dict, verified: bool, depth=None) -> list:
    log.info("Running trufflehog (depth limit: %s)", depth)

    cmd = [
        "trufflehog",
        "git",
        "--json",
        "--no-update",
    ]

    # We do not want to run the same detector twice, so verified=true runs only the detectors we
    # want to verify and verified=false runs only the detectors we do not want to verify
    if verified:
        cmd.append("--include-detectors")
        cmd.append(verified_detectors_allowlist_str)
    else:
        cmd.append("--no-verification")

        cmd.append("--exclude-detectors")
        cmd.append(verified_detectors_allowlist_str)

    if depth:
        cmd.append("--max_depth")
        cmd.append(str(depth))

    cmd.append("file://.")

    proc_results = subprocess.run(cmd, cwd=scan_path, capture_output=True, check=False)

    if proc_results.stderr:
        log.error(proc_results.stderr.decode("utf-8"))

    lines = proc_results.stdout.decode("utf-8").split("\n")

    del lines[-1]
    results = [json.loads(line) for line in lines]

    return results


if __name__ == "__main__":
    main()
