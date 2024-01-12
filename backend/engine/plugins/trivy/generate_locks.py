import subprocess
import os
from glob import glob
from engine.plugins.lib import utils
from engine.plugins.lib.write_npmrc import handle_npmrc_creation

logger = utils.setup_logging("trivy")


def install_package_files(include_dev, path, root_path):
    # Create a package-lock.json file if it doesn't already exist
    logger.info(
        f'Generating package-lock.json for {path.replace(root_path, "")} (including dev dependencies: {include_dev})'
    )
    cmd = [
        "npm",
        "install",
        "--package-lock-only",  # Generate the needed lockfile
        "--legacy-bundling",  # Don't dedup dependencies so that we can correctly trace their root in package.json
        "--legacy-peer-deps",  # Ignore peer dependencies, which is the NPM 6.x behavior
        "--no-audit",  # Don't run an audit
    ]
    if not include_dev:
        cmd.append("--only=prod")
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)


def check_package_files(path: str, include_dev: bool) -> tuple:
    """
    Main Function
    Find all of the package.json files in the repo and build lock files for them if they dont have one already.
    Parses the results and returns them with the errors.
    """

    # Find and loop through all the package.json files in the path
    files = glob("%s/**/package.json" % path, recursive=True)

    logger.info("Found %d package.json files", len(files))

    # Build a set of all directories containing package files
    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    # Write a .npmrc file based on the set of package.json files found
    handle_npmrc_creation(paths)

    # Loop through paths that have a package file and generate a package-lock.json for them (if does not exist)
    results_dct = {}
    for sub_path in paths:
        results_dct = {}
        lockfile = os.path.join(sub_path, "package-lock.json")
        lockfile_missing = not os.path.exists(lockfile)
        if lockfile_missing:
            msg = (
                f"No package-lock.json file was found in path {sub_path.replace(path, '')}. "
                "Please consider creating a package-lock file for this project."
            )
            results_dct["warning"] = msg
            r = install_package_files(include_dev, sub_path, path)
            if r.returncode != 0:
                logger.error(r.stderr.decode("utf-8"))
                logger.warn({"results": results_dct, "lockfile": lockfile, "lockfile_missing": lockfile_missing})
                return
    return
