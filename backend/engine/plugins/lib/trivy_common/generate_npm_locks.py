import os

from engine.plugins.lib import utils
from engine.plugins.lib.node_common import build_npm_context, run_npm_install
from engine.plugins.lib.write_npmrc import handle_npmrc_creation

logger = utils.setup_logging("trivy_sca")


def check_npm_package_files(path: str, include_dev: bool, npm_install: bool) -> tuple:
    """
    Find all of the package.json files in the repo and build lock files for them if they dont have one already.
    If npm_install is true, then that means we want to build the node_modules for every dir that has a package.json (Primarily to retrieve license info)
    Parses the results and returns them with the errors.
    """

    errors = []
    alerts = []

    npm_ctx = build_npm_context(path)
    alerts.extend(npm_ctx.alerts)

    # Collect all directories that need a .npmrc file
    npmrc_paths = npm_ctx.workspace_roots.keys() | npm_ctx.standalone_dirs.keys()
    if npmrc_paths:
        handle_npmrc_creation(logger, set(npmrc_paths))

    # Generate lockfiles for directories that need them.
    for sub_path in npm_ctx.needs_npm_generation:
        msg = (
            f"No package-lock.json file was found in path {sub_path.replace(path, '')}."
            " Please consider creating a package-lock file for this project."
        )
        logger.warning(msg)
        alerts.append(msg)

        r = run_npm_install(sub_path, include_dev, root_path=path)
        if r.returncode != 0:
            error = r.stderr.decode("utf-8")
            logger.error(error)
            errors.append(error)

    # When npm_install is True (trivy_sbom license path), run npm_install on directories
    # that now have a package-lock.json (either pre-existing or just generated).
    # Skip Yarn/pnpm dirs since npm install cannot work there.
    if npm_install:
        installable = {
            **npm_ctx.workspace_roots,
            **npm_ctx.standalone_dirs,
        }
        for sub_path, lockfile in installable.items():
            lock_path = os.path.join(sub_path, "package-lock.json")
            if not os.path.exists(lock_path):
                continue
            # Only run npm install where the package ecosystem is npm
            if lockfile is not None and lockfile != "npm":
                continue
            r = run_npm_install(sub_path, include_dev, package_lock_only=False, root_path=path)
            if r.returncode != 0:
                error = r.stderr.decode("utf-8")
                logger.error(error)
                errors.append(error)

    return errors, alerts
