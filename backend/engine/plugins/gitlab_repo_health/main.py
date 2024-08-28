import json
from typing import Optional

from artemislib.logging import Logger
from engine.plugins.lib import utils
from engine.plugins.gitlab_repo_health.utilities.config import Config
from engine.plugins.gitlab_repo_health.utilities.checker import Checker
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from engine.plugins.gitlab_repo_health.constants import PLUGIN_NAME

log = Logger(PLUGIN_NAME)


def main():
    args = utils.parse_args()

    result = run_repo_health(args)

    print(json.dumps(result))


def run_repo_health(args):
    output = {
        "success": False,
        "truncated": False,
        "details": [],
        "errors": [],
        "alerts": [],
        "debug": [],
        "event_info": {},
    }

    service = args.engine_vars.get("service_type")

    if service != "gitlab":
        # Repo health check only supports GitLab, but that's not our user's
        # fault, so let's return true
        output["success"] = True
        return output

    owner, repo = destructure_repo(args.engine_vars.get("repo"))
    config = get_config_from_args(args, output, service, owner, repo)
    if config is None:
        config = Config.default()

    try:
        Config.validate(config)
    except Exception as err:
        output["errors"].append(str(err))
        return output

    log.info(f"Using config '{config.get('name')}@{config.get('version')}'")

    gitlab = Gitlab.get_client_from_config(
        args.engine_vars.get("service_secret_loc"), args.engine_vars.get("service_hostname")
    )
    checker = Checker(gitlab, config)

    branch = args.engine_vars.get("ref") or gitlab.get_default_branch(owner, repo)

    hash = gitlab.get_branch_hash(owner, repo, branch)  # Get latest hash of default branch for event info

    results = checker.run(owner, repo, branch)

    output["details"].extend(results)
    output["success"] = are_results_passing(results)

    # Set the event info so that the engine will process configuration events from this plugin
    for result in results:
        output["event_info"][result["id"]] = result
        output["event_info"][result["id"]]["hash"] = hash

    return output


def destructure_repo(full_repo):
    try:
        owner, repo = full_repo.split("/", 1)
        return (owner, repo)
    except ValueError as err:
        raise Exception(f'Invalid repo, "{full_repo}". Expected format is <owner>/<repo>') from err


def are_results_passing(results):
    return all(map(lambda check: check["pass"], results))


def get_config_from_args(args, output: dict, service: str, owner: str, repo: str) -> Optional[dict]:
    if args.config:
        return args.config
    else:
        output["alerts"].append(f"No config found for '{service}/{owner}/{repo}'.")
        return None


if __name__ == "__main__":
    main()
