import json
import logging
import os
import subprocess
from dataclasses import dataclass, field
from glob import glob
from itertools import chain
from pathlib import Path
from subprocess import CompletedProcess
from typing import NamedTuple

logger = logging.getLogger(__name__)

# JavaScript Lockfile names
_LOCKFILE_MAP: dict[str, str] = {
    "package-lock.json": "npm",
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "bun.lock": "bun",
}

_REGISTRY_CHECK_TIMEOUT = 10  # seconds

_NPM_INSTALL_TIMEOUT = 300  # 5 minutes

# Map of directories to their lockfile types, or None if absent
DirLockfileMap = dict[str, str | None]


class DirectoryClassification(NamedTuple):
    workspace_roots: DirLockfileMap
    workspace_members: set[str]
    standalone_dirs: DirLockfileMap


@dataclass
class NpmScanContext:
    """
    Result of pre-flight analysis for a scanned repository
    """

    registry_reachable: bool = True
    workspace_roots: DirLockfileMap = field(default_factory=dict)
    workspace_members: set[str] = field(default_factory=set)
    standalone_dirs: DirLockfileMap = field(default_factory=dict)
    needs_npm_generation: list[str] = field(default_factory=list)
    alerts: list[str] = field(default_factory=list)


def _detect_lockfile(dir_path: str) -> str | None:
    """
    Check for a known lockfile in the directory and return its type, or None
    """
    for filename, lockfile_type in _LOCKFILE_MAP.items():
        if os.path.isfile(os.path.join(dir_path, filename)):
            return lockfile_type
    return None


def _get_workspace_globs(package_json_path: str) -> list[str]:
    """
    Read the workspace glob patterns from package.json.
    Returns an empty list if the file has no workspaces field.
    """
    try:
        with open(package_json_path, encoding="utf-8") as fh:
            data = json.load(fh)
    except (json.JSONDecodeError, OSError) as exc:
        logger.warning("Malformed or unreadable package.json: %s (%s)", package_json_path, exc)
        return []

    workspaces = data.get("workspaces")
    if workspaces is None:
        return []
    # npm / Yarn Berry: array of globs
    if isinstance(workspaces, list):
        return workspaces
    # Yarn Classic: {"packages": ["packages/*"]}
    if isinstance(workspaces, dict) and "packages" in workspaces:
        return workspaces["packages"]
    return []


def _is_workspace_root(package_json_path: str) -> bool:
    """
    Check if the package.json declares a "workspaces" field
    """
    return len(_get_workspace_globs(package_json_path)) > 0


def _classify_directories(package_json_paths: list[str]) -> DirectoryClassification:
    """
    Sort directories into workspace roots, workspace members, and standalone dirs.
    """
    workspace_roots: DirLockfileMap = {}
    workspace_members: set[str] = set()
    standalone_dirs: DirLockfileMap = {}

    dirs = sorted({os.path.dirname(p) for p in package_json_paths})

    # First pass: identify workspace roots
    for d in dirs:
        manifest = os.path.join(d, "package.json")
        if _is_workspace_root(manifest):
            lockfile = _detect_lockfile(d)
            workspace_roots[d] = lockfile

    # Resolve workspace globs to actual member directories
    for root in workspace_roots:
        for pattern in _get_workspace_globs(os.path.join(root, "package.json")):
            for match in glob(os.path.join(root, pattern, "package.json")):
                member_dir = os.path.dirname(match)
                if member_dir not in workspace_roots:
                    workspace_members.add(member_dir)

    # Second pass: classify remaining directories
    for d in dirs:
        if d in workspace_roots or d in workspace_members:
            continue
        lockfile = _detect_lockfile(d)
        standalone_dirs[d] = lockfile

    return DirectoryClassification(workspace_roots, workspace_members, standalone_dirs)


def check_registry_reachable(path: str, timeout: int = _REGISTRY_CHECK_TIMEOUT) -> bool:
    """
    Run npm ping from the given directory to verify the configured registry is reachable.
    """
    try:
        r = subprocess.run(
            ["npm", "ping"],
            capture_output=True,
            cwd=path,
            check=False,
            timeout=timeout,
        )
        return r.returncode == 0
    except subprocess.TimeoutExpired:
        return False


def run_npm_install(
    path: str,
    include_dev: bool,
    package_lock_only: bool = True,
    timeout: int = _NPM_INSTALL_TIMEOUT,
    root_path: str = "",
) -> CompletedProcess:
    """
    Run npm install in the given path to generate or populate a lockfile
    """
    relative_path = path.replace(root_path, "")
    logger.info(
        "Generating package-lock.json for %s (include dev dependencies: %s (build node modules: %s)",
        relative_path,
        include_dev,
        package_lock_only,
    )

    cmd: list[str] = [
        "npm",
        "install",
        "--legacy-bundling",  # Don't de-dupe dependencies so that we can correctly trace their root in package.json
        "--legacy-peer-deps",  # Ignore peer dependencies, which is the NPM 6.x behavior
        "--no-audit",  # Don't run an audit right now because we're going to run one next
        "--ignore-scripts",  # Skip execution of scripts
    ]
    if not include_dev:
        cmd.append("--only=prod")
    if package_lock_only:
        cmd.append("--package-lock-only")

    try:
        return subprocess.run(cmd, capture_output=True, cwd=path, check=False, timeout=timeout)
    except subprocess.TimeoutExpired:
        logger.error("npm install timed out after %ds in %s", timeout, relative_path)
        return CompletedProcess(
            args=cmd,
            returncode=1,
            stdout=b"",
            stderr=f"npm install timed out after {timeout}s in {path}".encode(),
        )


def build_npm_context(path: str) -> NpmScanContext:
    """
    Run all checks on the repository at the given path.
    Classifies directories, check lockfiles, verifies registry reachability,
    and builds the list of directories that need npm lockfile generation.
    """
    result = NpmScanContext()

    # Discover all package.json files.
    pattern = os.path.join(path, "**", "package.json")
    package_jsons = glob(pattern, recursive=True)

    # Exclude node_modules.
    package_jsons = [p for p in package_jsons if "node_modules" not in Path(p).parts]

    if not package_jsons:
        return result

    # Classify directories.
    roots, members, standalone = _classify_directories(package_jsons)
    result.workspace_roots = roots
    result.workspace_members = members
    result.standalone_dirs = standalone

    # Check registry reachability from the repo root.
    # npm ping reads the full .npmrc cascade and pings the configured registry.
    result.registry_reachable = check_registry_reachable(path)
    if not result.registry_reachable:
        result.alerts.append("npm registry unreachable. Lockfile generation skipped; scan results may be incomplete.")

    # Build the generation candidate list.
    for d, lockfile in chain(roots.items(), standalone.items()):
        if lockfile is not None:
            continue
        if not result.registry_reachable:
            # Skip directories with unreachable registries
            continue
        result.needs_npm_generation.append(d)

    return result
