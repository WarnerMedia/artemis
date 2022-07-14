import subprocess
from glob import glob

from engine.plugins.lib import utils


def run_analysis(path):
    """
    Finds jar files in the path and executes findsecbugs analysis, returning the results
    :param path: working directory
    :return: dict with analysis results
    """
    log = utils.setup_logging("findsecbugs_java_jars")
    log.info("Getting Jar List")
    jar_lists = _get_jar_list(path)
    log.info("Complete. Jar List Total: %d", len(jar_lists))
    return _run_find_sec_bugs_cli(path, jar_lists)


def _get_jar_list(path):
    """
    Find all of the jars in the scanned project path
    :param path:
    :return: list of jars found in path
    """
    return glob("%s/**/*.jar" % path, recursive=True)


def _run_find_sec_bugs_cli(path, jar_list):
    """
    Run the findsecbugs.sh script against each built jar
    :param path: working directory
    :param jar_list: list of jars found within the project
    :return: list scan results
    """
    results = []
    for jar in jar_list:
        r = subprocess.run(
            ["/app/findsecbugs/findsecbugs.sh", jar],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=path,
            check=False,
        )
        results.append({"output": r.stdout.decode("utf-8").rstrip().splitlines(), "status": r.returncode == 0})
    return results
