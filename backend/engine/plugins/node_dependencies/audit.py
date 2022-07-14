import json
import os
import subprocess

from engine.plugins.lib import utils

log = utils.setup_logging("node_dependencies")


def _run_install(include_dev, path, root_path):
    # Create a package-lock.json file if it doesn't already exist
    log.info(
        "Generating package-lock.json for %s (including dev dependencies: %s)", path.replace(root_path, ""), include_dev
    )
    cmd = [
        "npm",
        "install",
        "--package-lock-only",  # Generate the needed lockfile
        "--legacy-bundling",  # Don't dedup dependencies so that we can correctly trace their root in package.json
        "--legacy-peer-deps",  # Ignore peer dependencies, which is the NPM 6.x behavior
        "--no-audit",  # Don't run an audit right now because we're going to run one next
    ]
    if not include_dev:
        cmd.append("--only=prod")
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)


def _run_audit(include_dev, path, root_path):
    log.info("Running npm audit on %s (including dev dependencies: %s)", path.replace(root_path, ""), include_dev)
    cmd = ["npm", "audit", "--json"]
    if not include_dev:
        cmd.append("--production")
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)


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
        r = _run_install(include_dev, path, root_path)
        if r.returncode != 0:
            log.error(r.stderr.decode("utf-8"))
            return {"results": results_dct, "lockfile": lockfile, "lockfile_missing": lockfile_missing}

    # Run npm audit
    res = _run_audit(include_dev, path, root_path)

    if res.stderr:
        log.error(res.stderr.decode("utf-8"))

    if res.stdout:
        sout = json.loads(res.stdout.decode("utf-8"))
        results_dct.update(sout)
    return {"results": results_dct, "lockfile": lockfile, "lockfile_missing": lockfile_missing}
