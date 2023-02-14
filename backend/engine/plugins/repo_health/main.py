import json

from artemislib.github.app import GithubApp
from engine.plugins.lib import utils
from engine.plugins.repo_health.cli.src.utilities import Checker, Config, Github

log = utils.setup_logging("repo_health")


def main():
    args = utils.parse_args()

    output = {
        "success": False,
        "truncated": False,
        "details": {},
        "errors": [],
    }

    service = args.engine_vars.get("service")
    owner, repo = destructure_repo(args.engine_vars.get("repo"))
    config = args.config

    if service != "github":
        # Repo health check only supports Github, but that's not our user's
        # fault, so let's return true
        output["success"] = True
        return print_and_exit(output)

    if not config:
        output["errors"].append(f"No config found for '{service}/{owner}'")
        return print_and_exit(output)

    try:
        Config.validate(config)
    except Exception as err:
        output["errors"].append(str(err))
        return print_and_exit(output)

    log.info(f"Using config '{config.get('name')}@{config.get('version')}'")

    github_app = GithubApp()
    github_token = github_app.get_installation_token(owner)

    if github_token == None:
        output["errors"].append("Failed to authenticate to Github")
        return print_and_exit(output)

    github = Github.get_client_from_token(github_token)
    checker = Checker(github, config)

    branch = args.engine_vars["ref"] or github.get_default_branch(owner, repo)

    results = checker.run(owner, repo, branch)

    output["details"]["repo_health"] = results
    output["success"] = are_results_passing(results)

    print_and_exit(output)


def destructure_repo(full_repo):
    try:
        owner, repo = full_repo.split("/", 1)
        return (owner, repo)
    except ValueError as err:
        raise Exception(f'Invalid repo, "{full_repo}". Expected format is <owner>/<repo>') from err


def are_results_passing(results):
    return all(map(lambda check: check["pass"], results))


def print_and_exit(output, exit_code=0):
    print(json.dumps(output))
    # TODO remove log
    log.info(json.dumps(output))
    exit(exit_code)


if __name__ == "__main__":
    main()
