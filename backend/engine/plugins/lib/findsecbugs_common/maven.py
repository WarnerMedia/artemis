import subprocess
from collections import namedtuple

from engine.plugins.lib import utils
from engine.plugins.lib.findsecbugs_common.file_util import get_folders_with_file

MAVEN_RESPONSE = namedtuple("maven_response", ["pom_found", "mvn_results"])


def run_maven_clean_package(path):
    """
    Running maven clean package against java dir
    :param path: working directory
    :return: dict with maven run results
    """
    r = subprocess.run(
        ["mvn", "-q", "clean", "package"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, cwd=path, check=False
    )
    return {"output": r.stdout.decode("utf-8").rstrip(), "status": r.returncode == 0}


def execute_maven_builds(path) -> MAVEN_RESPONSE:
    """
    Executes maven clean package on directories where pom.xml is found. The results of these builds are returned.
    :param path: working directory
    :return: dict with maven run results
    """
    log = utils.setup_logging("findsecbugs_java_maven")
    log.info("Running Maven Clean and Package")
    mvn_paths = get_folders_with_file(path, "pom.xml")
    log.info("maven java builds found: %d", len(mvn_paths))
    mvn_results = []
    for mvn_path in mvn_paths:
        mvn_result = run_maven_clean_package(mvn_path)
        if mvn_result["status"]:
            mvn_results.append(mvn_result)
    return MAVEN_RESPONSE(bool(mvn_paths), mvn_results)
