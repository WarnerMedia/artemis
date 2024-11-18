import subprocess
import os
from glob import glob
from engine.plugins.lib import utils
from engine.plugins.lib.write_npmrc import handle_npmrc_creation

logger = utils.setup_logging("trivy_sca")

cmd = [
    "npm",
    "install",
    "--legacy-bundling",  # Don't dedup dependencies so that we can correctly trace their root in package.json
    "--legacy-peer-deps",  # Ignore peer dependencies, which is the NPM 6.x behavior
    "--no-audit",  # Don't run an audit
    "--ignore-scripts",  # Skip execution of scripts
]


def install_package_files(include_dev: bool, path: str, root_path: str, npm_install: bool):
    # Create a package-lock.json file if it doesn't already exist
    logger.info(
        f'Generating package-lock.json for {path.replace(root_path, "")} (including dev dependencies: {include_dev} (build node modules: {npm_install})'
    )
    if not include_dev:
        cmd.append("--only=prod")
    if not npm_install:
        cmd.append("--package-lock-only")
    return subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False)


def check_package_files(path: str, include_dev: bool, npm_install: bool) -> tuple:
    """
    Main Function
    Find all of the package.json files in the repo and build lock files for them if they dont have one already.
    If npm_install is true, then that means we want to build the node_modules for every dir that has a package.json (Primarily to retrieve license info)
    Parses the results and returns them with the errors.
    """

    errors = []
    alerts = []

    # Find and loop through all the package.json files in the path
    all_package_files = glob(f"{path}/**/package.json", recursive=True)

    # Filter out paths that contain 'node_modules'
    files = [file for file in all_package_files if "node_modules" not in file]

    logger.info("Found %d package.json files", len(files))

    # If there are no package.json files, exit function
    if len(files) == 0:
        return errors, alerts

    # Build a set of all directories containing package files
    paths = set()
    for filename in files:
        paths.add(os.path.dirname(filename))

    # Write a .npmrc file based on the set of package.json files found
    handle_npmrc_creation(logger, paths)

    # Loop through paths that have a package file
    for sub_path in paths:
        lockfile = os.path.join(sub_path, "package-lock.json")
        lockfile_missing = not os.path.exists(lockfile)
        # Generate a lock file if does not exist in path that has a package.json
        if lockfile_missing:
            msg = (
                f"No package-lock.json file was found in path {sub_path.replace(path, '')}."
                " Please consider creating a package-lock file for this project."
            )
            logger.warning(msg)
            alerts.append(msg)
            r = install_package_files(include_dev, sub_path, path, npm_install)
            if r.returncode != 0:
                error = r.stderr.decode("utf-8")
                logger.error(error)
                errors.append(error)
                return errors, alerts
        # If npm_install is true, but lock file already exists run npm install
        if npm_install and not lockfile_missing:
            r = install_package_files(include_dev, sub_path, path, npm_install)
            if r.returncode != 0:
                error = r.stderr.decode("utf-8")
                logger.error(error)
                errors.append(error)
                return errors, alerts
    # Return the results
    return errors, alerts
