"""
php_sensio_security_checker plugin
"""
import json
import logging
import os
import shutil
import subprocess
from json.decoder import JSONDecodeError
from pathlib import Path
from typing import Mapping

from engine.plugins.lib import nvd_utils, utils
from engine.plugins.php_sensio_security_checker.prep import setup_requirements
from engine.plugins.php_sensio_security_checker.utils import parse_args

log = utils.setup_logging("php_sensio_security_checker")

# Boto3 client sends output to stdout/err by default.
# This causes issues downstream in the engine.
# This logging option suppresses that output.
logging.getLogger("boto3").propagate = False

"""
Abstraction of the php compose file
package_name:str                - Name of the package
composer_file_name:str          - File Path of the composer file
require: dict [str , str ]     - required package and version  { package_name : package_version }
require_dev: dict [ str , str ] - required package and version { package_name : package_version }
"""


class PhpDependencyNode:
    def __init__(
        self,
        package_name: str,
        composer_file_name: str,
        require: Mapping[str, str] = map(lambda x: x, {}),
        require_dev: Mapping[str, str] = map(lambda x: x, {}),
    ):
        super().__init__()
        self.package_name = package_name
        self.composer_file_name = composer_file_name
        self.require = require
        self.require_dev = require_dev

    def __iter__(self):
        yield from {
            "package_name": self.package_name,
            "composer_file_name": self.composer_file_name,
            "require": self.require,
            "require_dev": self.require_dev,
        }.items()

    def __str__(self):
        return json.dumps(dict(self), ensure_ascii=False)

    def __repr__(self):
        return self.__str__()


# Encapsulating Data Structure to manage queueing build dependencies
class BuildOrder:
    def __init__(self) -> None:
        self.order = []

    def add_node(self, newNode: PhpDependencyNode):
        inserted = False
        # iterate through all scheduled dependency nodes, preappend node if it is a dependency
        for idx, node in enumerate(self.order):
            if (newNode.package_name in node.require) or (newNode.package_name in node.require_dev):
                self.order.insert(idx, newNode)
                inserted = True
                break
        # assume no dependency append node at the end
        if not inserted:
            self.order.append(newNode)


def run_security_checker(repo_path: str, bin_path: str) -> dict:
    """
    Run the library after composer install has finished successfully.
    The sensio binary is part of the docker image.
    Sensio returns 0 if no vulns found. 1 otherwise.
    :param: repo_path: string with path to working directory for repo
    :param: bin_path: string with path to working directory for binary
    :return: dictionary
    """
    if not os.path.exists(f"{repo_path}/composer.json"):
        log.info("composer.json not found. SensioLabs Security Checker scan skipped.")
        return {"result": True, "stdout": "", "stderr": ""}

    proc_results = subprocess.run(
        ["./security-checker", "--format=json", f"--path={repo_path}/composer.lock"],
        cwd=bin_path,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )

    return {
        "result": proc_results.returncode == 0,
        "stdout": proc_results.stdout.decode("utf-8").strip(),
        "stderr": proc_results.stderr.decode("utf-8"),
    }


def build_results(output: str, composer_dir: str) -> list:
    try:
        output_json = json.loads(output)
    except json.JSONDecodeError:
        log.error(f"Could not load JSON output: {output}")
        return []

    results = []
    for pkg in output_json:
        for adv in output_json[pkg]["advisories"]:
            cve = adv["cve"] if adv["cve"] else adv["link"]
            results.append(
                {
                    "component": f"{pkg}-{output_json[pkg]['version']}",
                    "source": f"{composer_dir}/composer.lock",
                    "id": cve,
                    "description": adv["title"],
                    "severity": nvd_utils.get_cve_severity(cve, log) or "",
                    "remediation": "",
                    "inventory": {
                        "component": {"name": pkg, "version": output_json[pkg]["version"], "type": "php"},
                        "advisory_ids": list(set(filter(None, [adv["cve"], adv["link"]]))),
                    },
                }
            )
    return results


def populate_info_messages(setup_results: dict, composer_dir: str) -> list:
    """
    Determine if any failures need to be passed on to the user.
    :todo: Parameterize pass/fail results based on findings
    :param setup_results: dictionary
    :param composer_dir: str
    :return: dictionary
    """
    info = []
    if not setup_results["build_auth_json"]:
        info.append(f"{composer_dir}/composer.json: build_auth_json failed")
    if setup_results.get("composer_info"):
        info.append(setup_results["composer_info"])
    elif not setup_results["composer_install"]:
        info.append(f"{composer_dir}/composer.json: composer_install failed")
    return info


def remove_created_files(compose_dir: str):
    # NOTE: Do not remove the deletion of the vendor directory.
    # This generated directory houses a compose.json, creating an infinite loop if not removed

    shutil.rmtree(os.path.join(compose_dir, "vendor"), ignore_errors=True)
    composer_file = os.path.join(compose_dir, "composer.lock")
    if os.path.exists(composer_file):
        os.remove(composer_file)


def process_compose_dir(repo_path: str, bin_path: str, compose_dir: str) -> dict:
    """
    Runs required functions necessary prior to running security checker
    and executes security checker for the composer directory.
    Parses the results, deletes any files created, and returns the results.
    """
    results = {
        "details": [],
        "errors": [],
        "info": [],
    }
    relative_compose_dir = os.path.relpath(compose_dir, repo_path)
    setup_results_dict = setup_requirements(compose_dir)
    scan_results_dict = run_security_checker(compose_dir, bin_path)

    # parse Scan Results
    scan_results = build_results(scan_results_dict["stdout"], relative_compose_dir)
    # set scan results as result details
    results["details"] = scan_results
    # Check if any info messages need to be added based on results
    results["info"] = populate_info_messages(setup_results_dict, relative_compose_dir)

    if scan_results_dict["stderr"]:
        results["errors"] = [scan_results_dict["stderr"].replace(f"{repo_path}", "")]
    remove_created_files(compose_dir)
    return results


def generate_build_order(project_path, file: str):
    """
    Finds all files matching the name (file) within the project_path
    The files are expected to be json files in composer format.
    Builds a list of PhpDependencyNodes that correspond to the composer files ordering
    the nodes that are in the require or require-dev potion of the composer file first in the list
    to ensure that the composer cache can satisfy required packages during the build
    """
    errors = []
    build_order = BuildOrder()
    log.info("Building project composer file dependency build order")
    for idx, path in enumerate(Path(project_path).rglob(file)):
        try:
            with open(path, "r") as config_file:
                composer_details = json.loads(config_file.read())
                build_order.add_node(
                    PhpDependencyNode(
                        composer_details.get("name", "No Package Name"),
                        str(path),
                        composer_details.get("require", {}),
                        composer_details.get("require-dev", {}),
                    )
                )
        except JSONDecodeError as e:
            error_message = f"Malformed composer file {idx + 1}:{str(path).replace(project_path,'')} {e}"
            log.error(error_message)
            errors.append(error_message)

    return {"build_order": build_order, "errors": errors}


def process_composer_files(args) -> dict:
    """
    Gets the Satis Auth Secret, grabs all the directories containing a composer.json file,
    processes each directory, and adds the result to the final_result.
    If there are any details, success is set to False and the result dict is returned.
    """
    details = []
    errors = []
    info = []

    build_result = generate_build_order(args.path, "composer.json")
    errors.extend(build_result.get("errors"))

    build_order: BuildOrder = build_result.get("build_order")
    # weird enumerate behavior that changes list order, dont use it here.
    # pylint: disable=[consider-using-enumerate]
    for idx in range(0, len(build_order.order)):
        compose_dir = os.path.dirname(build_order.order[idx].composer_file_name)
        relative_compose_dir = os.path.relpath(compose_dir, args.path)
        log.info("Executing directory %d: (%s) %s", idx + 1, build_order.order[idx].package_name, relative_compose_dir)

        results = process_compose_dir(args.path, args.bin_path, compose_dir)
        details.extend(results["details"])
        errors.extend(results["errors"])
        info.extend(results["info"])

    if info:
        log.info(info)

    return {"details": details, "errors": errors, "info": info, "success": not bool(details)}


def clean_up_auth_files(project_path, file: str):
    """
    Find all files  with the authentication file matching name(file) within the project_path file path
    and remove/purge them if they exist.
    """
    for idx, file_auth_json in enumerate(Path(project_path).rglob(file)):
        if os.path.exists(file_auth_json):
            log.info(f"{idx + 1} Removing {str(file_auth_json).replace(project_path,'')} ")
            os.remove(file_auth_json)


def main():
    """
    Main plugin execution
    """
    log.info("Starting php sensio security scanner")
    args = parse_args()

    try:
        final_results = process_composer_files(args)
        print(json.dumps(final_results))
    finally:
        clean_up_auth_files(args.path, "auth.json")


if __name__ == "__main__":
    main()
