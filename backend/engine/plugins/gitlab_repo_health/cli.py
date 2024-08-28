import argparse
import json
import sys

from engine.plugins.gitlab_repo_health.utilities.checker import Checker
from engine.plugins.gitlab_repo_health.utilities.config import Config
from engine.plugins.gitlab_repo_health.utilities import environment
from engine.plugins.gitlab_repo_health.utilities.gitlab import Gitlab
from engine.plugins.gitlab_repo_health.utilities.errors import ErrorCode

LIST_AVAILABLE_RULES = "--list-available-rules"
JSON_INDENT = 2


def main():
    if LIST_AVAILABLE_RULES in sys.argv:
        # Exit before argparse, since otherwise "repo" arg is required
        print(json.dumps(Checker.get_available_rules(), indent=JSON_INDENT))
        return

    parser = _get_parser()
    args = parser.parse_args()

    gitlab = Gitlab.get_client_from_config(args.secret_token_location, args.service, verbose=args.verbose)
    config = _get_config(args, gitlab)
    checker = Checker(gitlab, config)

    owner, repo = _destructure_repo(args.repo)

    try:
        branch = args.branch or gitlab.get_default_branch(owner, repo)

        results = checker.run(owner, repo, branch)
        full_result = _get_full_result(config, owner, repo, branch, results)

        if args.json:
            print(json.dumps(full_result, indent=JSON_INDENT))
        else:
            _pretty_print(full_result, args.verbose)
    except Exception as err:
        _handle_exception(err, args.json)


def _get_parser():
    parser = argparse.ArgumentParser(
        description="Checks Gitlab repo health against a baseline defined in a configuration"
    )
    parser.add_argument("service", type=str, help="the domain of the Gitlab instance to run on. ex: git.gitlab.com")
    parser.add_argument(
        "repo",
        metavar="SERVICE/OWNER/REPO",
        type=str,
        help="the repo to run on. ex: <owner>/<repo>",
    )
    parser.add_argument(
        "secret_token_location",
        type=str,
        help="the location of the token in secrets manager. ex: artemis/gitlab-api-key",
    )
    parser.add_argument(
        "-b",
        "--branch",
        type=str,
        help="the branch to run on. Without this parameter, it will run on the repo's default branch",
    )
    parser.add_argument("-c", "--config", type=str, help="path to file to use as a config")
    parser.add_argument(
        "--ghconfig",
        type=str,
        help="Gitlab path to file to use as a config. ex: <owner>/<repo>:<path-to-file>",
    )
    parser.add_argument("--json", action="store_true", help="print output as a json object")
    parser.add_argument("-v", "--verbose", action="store_true")
    parser.add_argument(
        LIST_AVAILABLE_RULES,
        action="store_true",
        help="print the rules that are available to be run",
    )

    return parser


def _get_config(args, gitlab):
    if args.config:
        return Config.from_file(args.config, verbose=args.verbose)
    elif args.ghconfig:
        return Config.from_gitlab(gitlab, args.ghconfig, verbose=args.verbose)
    elif environment.has_config_file():
        config_file = environment.get_config_file()

        if args.verbose:
            print(f'[CONFIG] Found "{environment.RH_CONFIG_FILE_VAR}" in environment. Proceeding with "{config_file}"')

        return Config.from_file(config_file, verbose=args.verbose)  # type:ignore
    elif environment.has_gitlab_config():
        gitlab_config = environment.get_gitlab_config()

        if args.verbose:
            print(
                f'[CONFIG] Found "{environment.RH_GITLAB_CONFIG_VAR}" in environment. Proceeding with "{gitlab_config}"'
            )

        return Config.from_gitlab(gitlab, gitlab_config, verbose=args.verbose)  # type:ignore
    else:
        return Config.default(verbose=args.verbose)


def _destructure_repo(full_repo):
    try:
        owner, repo = full_repo.split("/", 1)
        return (owner, repo)
    except ValueError as err:
        raise Exception(f'Invalid repo, "{full_repo}". Expected format is <owner>/<repo>') from err


def _get_full_result(config, owner, repo, branch, results):
    result = {
        "ruleset": config.get("name"),
        "ruleset_version": config.get("version"),
        "target": {
            "owner": owner,
            "repo": repo,
            "branch": branch,
        },
        "results": results,
    }

    return result


def _pretty_print(full_result, verbose=False):
    if verbose:
        target = full_result.get("target")

        owner = target.get("owner")
        repo = target.get("repo")
        branch = target.get("branch")
        ruleset = full_result.get("ruleset")
        ruleset_version = full_result.get("ruleset_version")

        print(f"Repo:            {owner}/{repo}")
        print(f"Branch:          {branch}")
        print(f"Ruleset:         {ruleset}")
        print(f"Ruleset Version: {ruleset_version}")
        print("Results:")

    for check in full_result.get("results"):
        passing = check.get("pass")
        check_name = check.get("name")
        check_id = check.get("id")
        check_description = check.get("description")
        error_message = check.get("error_message")

        if verbose:
            print(f"  {check_name}:")
            print(f"    ID:          {check_id}")
            print(f"    Pass:        {passing}")
            print(f"    Description: {check_description}")

            if error_message:
                print(f"    Error:       {error_message}")
        else:
            pass_text = "[PASS]" if passing else "[FAIL]"

            if error_message:
                print(f"{pass_text} {check_name} - Error: {error_message}")
            else:
                print(f"{pass_text} {check_name}")


def _handle_exception(err, print_json):
    err_code = getattr(err, "code", ErrorCode.UNEXPECTED)

    if print_json or err_code != ErrorCode.UNEXPECTED:
        err_message = str(err)

        if print_json:
            err_obj = {
                "error": err_message,
                "code": err_code,
            }

            print(json.dumps(err_obj, indent=JSON_INDENT))
        else:
            print(err_message)

        exit(err_code)
    else:
        raise err from None


if __name__ == "__main__":
    main()
