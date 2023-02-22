import json

from artemislib.github.app import GithubApp
from engine.plugins.github_repo_health.cli.src.utilities import Checker, Config, Github
from engine.plugins.lib import utils

PLUGIN_NAME = "github_repo_health"

# Will be used if service is "github", but no matching PluginConfig is found
DEFAULT_CONFIG = {
    "name": "artemis_default",
    "version": "1.0.0",
    "rules": [
        {
            "type": "branch_commit_signing",
            "id": "github_branch_commit_signing",
        },
        {
            "type": "branch_enforce_admins",
            "id": "github_branch_enforce_admins",
        },
        {
            "type": "branch_pull_requests",
            "id": "github_branch_pull_requests",
            "expect": {
                "dismiss_stale_reviews": True,
                "require_code_owner_reviews": True,
            },
            "min_approvals": 1,
        },
        {
            "type": "branch_status_checks",
            "id": "github_branch_status_checks",
            "expect": {
                "strict": True,
            },
        },
        {
            "type": "repo_security_alerts",
            "id": "github_repo_security_alerts",
        },
        # Refer to engine/plugins/github_repo_health/cli/src/rules for other rules
    ],
}

log = utils.setup_logging(PLUGIN_NAME)


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
    }

    service = args.engine_vars.get("service")

    if service != "github":
        # Repo health check only supports Github, but that's not our user's
        # fault, so let's return true
        output["success"] = True
        return output

    owner, repo = destructure_repo(args.engine_vars.get("repo"))
    config = get_config_from_args(args, output, service, owner, repo)

    try:
        Config.validate(config)
    except Exception as err:
        output["errors"].append(str(err))
        return output

    log.info(f"Using config '{config.get('name')}@{config.get('version')}'")

    github_app = GithubApp()
    github_token = github_app.get_installation_token(owner)

    if github_token == None:
        output["errors"].append("Failed to authenticate to Github")
        return output

    github = Github.get_client_from_token(github_token)
    checker = Checker(github, config)

    branch = args.engine_vars["ref"] or github.get_default_branch(owner, repo)

    results = checker.run(owner, repo, branch)

    output["details"].extend(results)
    output["success"] = are_results_passing(results)

    return output


def destructure_repo(full_repo):
    try:
        owner, repo = full_repo.split("/", 1)
        return (owner, repo)
    except ValueError as err:
        raise Exception(f'Invalid repo, "{full_repo}". Expected format is <owner>/<repo>') from err


def are_results_passing(results):
    return all(map(lambda check: check["pass"], results))


def get_config_from_args(args, output, service, owner, repo):
    if args.config:
        return args.config
    else:
        output["alerts"].append(f"No config found for '{service}/{owner}/{repo}'. Using default config")
        return DEFAULT_CONFIG


if __name__ == "__main__":
    main()
