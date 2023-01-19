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

    # TODO confirm that this is how the repo is passed
    owner, repo = _destructure_repo(args.engine_vars["repo"])
    org_config = args.config[owner]

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


def _destructure_repo(full_repo):
    try:
        owner, repo = full_repo.split("/", 1)
        return (owner, repo)
    except ValueError as err:
        raise Exception(f'Invalid repo, "{full_repo}". Expected format is <owner>/<repo>') from err


def are_results_passing(results):
    return all(map(lambda check: check["pass"], results))


def print_and_exit(output, exit_code=0):
    print(json.dumps(output))
    exit(exit_code)


if __name__ == "__main__":
    main()
