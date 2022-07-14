import json

from engine.plugins.lib import utils
from engine.plugins.lib.findsecbugs_common.jar_util import run_analysis
from engine.plugins.lib.findsecbugs_common.maven import execute_maven_builds
from engine.plugins.lib.findsecbugs_common.parsing_util import parse_cli_results

log = utils.setup_logging("findsecbugs_java")


def main_util():
    """
    Executes main function for findsecbugs_java 7,8, and 13
    :todo: Will want to expand this out to ant and gradle builds as well
    """
    args = utils.parse_args()
    maven_response = execute_maven_builds(args.path)
    log.info("Maven Complete")
    if len(maven_response.mvn_results) > 0:
        cli_results = run_analysis(args.path)
        success, parsed_output = parse_cli_results(cli_results)
        return json.dumps({"success": success, "details": parsed_output})

    if maven_response.pom_found:
        return json.dumps({"success": True, "info": ["Java Maven build failed"]})

    return json.dumps({"success": True, "info": ["Could not find a pom.xml in the project"]})
