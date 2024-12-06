"""
owasp dep check plugin
"""

import json
import os
import subprocess

from engine.plugins.lib import utils

log = utils.setup_logging("owasp_dependency_check")


def attempt_maven_build(repo_path: str, scan_working_dir: str, java_versions: list, engine_id: str) -> dict:
    """
    Blindly cycle through the versions of java available.
    :param repo_path: path mounted from engine
    :param scan_working_dir: path to the cloned repo
    :param java_versions: list of java versions to try
    :param engine_id: containerID that stores the shared volumes
    :return: dict
    """
    for version in java_versions:
        git_clean_repo(repo_path)

        log.info("Attempting build using Java %s", version)
        build_res = subprocess.run(
            [
                "docker",
                "run",
                "--rm",
                "--volumes-from",
                f"{engine_id}",
                "-v",
                "/var/run/docker.sock:/var/run/docker.sock",
                "-w",
                f"{scan_working_dir}",
                f"maven:3-jdk-{version}",
                "mvn",
                "-q",
                "-DskipTests",
                "clean",
                "package",
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=repo_path,
            check=False,
        )

        if build_res.returncode == 0:
            log.info("Build succeeded using Java %s", version)
            return {
                "build_status": True,
                "build_debug": {"java_version": version, "build_res": str(build_res).rstrip()},
                "java_version": version,
            }
        log.info("Build failed using Java %s", version)

    log.info("Build failed using all versions of Java")
    return {"build_status": False, "build_debug": None, "java_version": None}


def git_clean_repo(path: str) -> bool:
    """
    Clean repo between java build attempts
    :param path: current working directory to run command
    :return: bool
    """
    r = subprocess.run(
        ["git", "clean", "-f", "-d", "-x"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False
    )
    return r.returncode == 0


def run_owasp_dep_check(repo_path: str, owasp_path: str, repo_name: str) -> dict:
    """
    Run the dependency-check.sh script against each built jar
    :param repo_path: path to work directory
    :param owasp_path: base directory of unzipped owasp cli
    :param repo_name: name of the git repo being analyzed
    :todo --failOnCVSS <score> Specifies if the build should be failed
    :return: dict scan results
    """
    r = subprocess.run(
        [
            f"{owasp_path}bin/dependency-check.sh",
            "--project",
            f"{repo_name}",
            "-f",
            "JSON",
            "--disableNodeAudit",
            "--disableBundleAudit",
            "--disableNodeJS",
            "--disableYarnAudit",
            "--scan",
            f"{repo_path}",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        cwd=repo_path,
        check=False,
    )
    if r.returncode != 0:
        log.error(r.stdout.decode("utf-8"))
        log.error(r.stderr.decode("utf-8"))

    return parse_scanner_output_json(repo_path, r.returncode)


def parse_scanner_output_json(repo_path: str, returncode: int) -> dict:
    """
    Parse json output from dependency-check.sh.
    Limit output to filename, score and severity.
    :return: list of dicts
    """
    results = []
    success = returncode == 0
    errors = []

    if not os.path.exists(f"{repo_path}dependency-check-report.json"):
        return {"output": [], "errors": ["No report file found"], "success": success}

    with open(f"{repo_path}dependency-check-report.json") as json_file:
        data = json.load(json_file)
        results = parse_vulnerabilities(data)
        errors = parse_errors(data)

    success = success & len(results) == 0
    return {"output": results, "errors": errors, "success": success}


def parse_vulnerabilities(data: dict) -> list:
    """
    Parse Vulnerabilities reported by owasp-dependency-check in the JSON report
    :return: list of dicts
    """
    results = []
    for dep in data["dependencies"]:
        if "vulnerabilities" in dep:
            for vuln in dep["vulnerabilities"]:
                results.append(
                    {
                        "component": dep["fileName"],
                        "source": "pom.xml",  # Can this be more specific?
                        "id": vuln["name"],
                        "description": vuln["description"],
                        "severity": vuln["severity"].lower(),
                        "remediation": "",
                        "inventory": {
                            "component": {"name": vuln["name"], "version": "", "type": "maven"},
                            "advisory_ids": [
                                vuln["name"],
                            ],
                        },
                    }
                )
    return results


def parse_errors(data: list) -> list:
    """
    Parse errors reported by owasp-dependency-check in JSON report
    :return: list of strings
    """
    errors = []
    owasp_errors = data["scanInfo"].get("analysisExceptions", [])

    for error in owasp_errors:
        errors.append(error["exception"]["message"])

    return errors


def pom_exists(repo_path: str) -> bool:
    """
    Maven requires a pom.xml in its working directory or a path/to/pom.xml inorder to build the project
    Returns True if a pom.xml file is found at the root of the project
    :return: bool
    """
    log.info("Searching for pom file in: %s", repo_path)
    return os.path.isfile(f"{repo_path}/pom.xml")


def main():
    """
    Main plugin execution
    """
    args = utils.parse_args(
        extra_args=[
            [["cli_path"], {"type": str, "nargs": "?", "default": "/app/owasp_dependency-check/dependency-check/"}],
            [["java_versions"], {"type": str, "nargs": "?", "default": '{\r\n\t"version_list": [7, 8, 12, 13]\r\n}'}],
        ]
    )

    # Normalize the path
    if not args.cli_path.endswith("/"):
        args.cli_path += "/"

    if not pom_exists(args.path):
        log.info("No pom.xml found in the root of the project")
        owasp_results = {
            "success": True,
            "info": ["No pom.xml found in the root of the project"],
        }
    else:
        log.info("Maven pom.xml found")
        scan_working_dir = os.path.join("/work", args.engine_vars.get("scan_id", ""), "base")
        java_build_results = attempt_maven_build(
            args.path,
            scan_working_dir,
            json.loads(args.java_versions)["version_list"],
            args.engine_vars.get("engine_id", ""),
        )
        if java_build_results["build_status"]:
            owasp_results = run_owasp_dep_check(args.path, args.cli_path, args.engine_vars.get("repo", ""))
        else:
            owasp_results = {
                "success": True,
                "info": ["Java build failed"],
            }

    print(
        json.dumps(
            {
                "success": owasp_results["success"],
                "details": owasp_results.get("output", []),
                "errors": owasp_results.get("errors", []),
            }
        )
    )


if __name__ == "__main__":
    main()
