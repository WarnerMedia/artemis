import json
import os
import subprocess
from subprocess import CompletedProcess

from engine.plugins.lib import utils
from engine.plugins.lib.node_common import run_npm_install

log = utils.setup_logging("node_dependencies")

_NPM_AUDIT_TIMEOUT = 300  # 5 minutes


def _run_audit(include_dev: bool, path: str, root_path: str) -> CompletedProcess:
    """
    Run npm audit --json to get vulnerability data with a timeout
    """
    log.info("Running npm audit on %s (including dev dependencies: %s)", path.replace(root_path, ""), include_dev)
    cmd = ["npm", "audit", "--json"]
    if not include_dev:
        cmd.append("--production")

    try:
        return subprocess.run(
            cmd,
            capture_output=True,
            cwd=path,
            check=False,
            timeout=_NPM_AUDIT_TIMEOUT,
        )
    except subprocess.TimeoutExpired:
        msg = f"npm audit timed out after {_NPM_AUDIT_TIMEOUT}s in {path}"
        log.error("%s", msg)
        return CompletedProcess(
            args=cmd,
            returncode=1,
            stdout=json.dumps({"error": {"summary": msg}}).encode(),
            stderr=msg.encode(),
        )


def npm_audit(path: str, include_dev: bool = False, root_path: str = str()) -> dict:
    """
    Run 'npm audit' on the file and capture the JSON results
    """
    results_dct = {}
    lockfile = os.path.join(path, "package-lock.json")
    lockfile_missing = not os.path.exists(lockfile)
    if lockfile_missing:
        msg = (
            f"No package-lock.json file was found in path {path.replace(root_path, '')}. "
            "Please consider creating a package-lock file for this project."
        )
        results_dct["warning"] = msg
        r = run_npm_install(path, include_dev, root_path=root_path)
        if r.returncode != 0:
            stderr_msg = r.stderr.decode("utf-8")
            log.error(stderr_msg)
            results_dct["error"] = {"summary": stderr_msg}
            return {"results": results_dct, "lockfile": lockfile, "lockfile_missing": lockfile_missing}

    # Run npm audit
    res = _run_audit(include_dev, path, root_path)

    if res.stderr:
        log.error(res.stderr.decode("utf-8"))

    if res.stdout:
        sout = json.loads(res.stdout.decode("utf-8"))
        results_dct.update(sout)
    elif res.returncode != 0:
        # No JSON output and non-zero exit, likely a timeout or crash
        stderr_msg = res.stderr.decode("utf-8") if res.stderr else "npm audit failed with no output"
        results_dct["error"] = {"summary": stderr_msg}
    return {"results": results_dct, "lockfile": lockfile, "lockfile_missing": lockfile_missing}
