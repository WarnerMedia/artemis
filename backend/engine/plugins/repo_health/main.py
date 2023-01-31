import json

from engine.plugins.lib import utils
from engine.plugins.repo_health.cli.src.utilities import Checker, Config, Github
from libs.artemislib.artemislib.github.app import GithubApp

log = utils.setup_logging("repo_health")


def main():
    args = utils.parse_args()

    output = {
        "success": False,
        "truncated": False,
        "details": [],
        "errors": [],
    }

    # TODO confirm that this is how the service, owner, repo are passed
    service, owner = _destructure_service(args.engine_vars["service"])
    repo = args.engine_vars["repo"]
    # TODO confirm and wire up org config. This assumes an arbitrary json object is passed
    #      with properties equal to the GitHub org name and values as valid repo-health configs
    org_config = args.config[owner]

    if service != "github":
        # Repo health check only supports Github. Otherwise return true
        output["success"] = True
        return print_and_exit(output)

    if org_config == None:
        output["errors"].append(f"No repo-health config found for organization, '{owner}'")
        return print_and_exit(output)

    try:
        Config.validate(org_config)
    except Exception as err:
        output["errors"].append(str(err))
        return print_and_exit(output)

    github_app = GithubApp()
    github_token = github_app.get_installation_token(owner)

    if github_token == None:
        output["errors"].append("Failed to authenticate to Github")
        return print_and_exit(output)

    github = Github.get_client_from_token(github_token)
    checker = Checker(github, org_config)

    branch = args.engine_vars["ref"] or github.get_default_branch(owner, repo)

    results = checker.run(owner, repo, branch)

    # TODO might need to translate results, depending on how the plugin format is finalized
    output["details"] = results
    output["success"] = are_results_passing(results)

    print_and_exit(output)


def _destructure_service(full_service):
    try:
        source_service, owner = full_service.split("/", 1)
        return (source_service, owner)
    except ValueError as err:
        raise Exception(f'Invalid service, "{full_service}". Expected format is <service>/<owner>') from err


def are_results_passing(results):
    return all(map(lambda check: check["pass"], results))


def print_and_exit(output, exit_code=0):
    print(json.dumps(output))
    exit(exit_code)


if __name__ == "__main__":
    main()
