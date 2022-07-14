import json
import subprocess

from engine.plugins.lib import utils
from engine.plugins.php_sensio_security_checker.utils import parse_args

log = utils.setup_logging("php_sensio_security_checker")


def build_auth_json(secrets: dict, repo_path: str) -> bool:
    """
    Retrieve secrets and build auth.json file in $COMPOSER_HOME
    Example:
    :param: secrets: dictionary with satis_user_name and password
    :param: repo_path: string with path to working directory
    :return: boolean
    """
    if secrets["status"]:
        sec_json = json.loads(secrets["response"])
        file_auth_json = f"{repo_path}/auth.json"
        auth_json = {
            "http-basic": {sec_json["url"]: {"username": sec_json["username"], "password": sec_json["password"]}}
        }
        try:
            with open(file_auth_json, "w") as outfile:
                json.dump(auth_json, outfile)
        except IOError:
            return False
    else:
        return False

    return True


def composer_install(repo_path: str) -> dict:
    """
    Run composer install, so generated composer.lock file can be analyzed.
    NOTE: auth.json must build successfully.
    :param: repo_path: string with path to working directory
    :return: dictionary showing success and details.
    """
    try:
        completed_proc = subprocess.run(
            ["composer", "install", "-n", "--ignore-platform-reqs", "--no-ansi", "--no-progress"],
            cwd=repo_path,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=False,
        )
        if completed_proc.returncode != 0:
            failure_details = completed_proc.stderr.decode("utf-8")
            log.info(failure_details)
            return {"success": False, "details": failure_details}
        return {"success": True, "details": ""}
    except FileNotFoundError:
        log.info("SensioLabs Security Checker scan skipped.")
        return {
            "success": False,
            "details": "SensioLabs Security Checker scan skipped "
            "as this PHP project is not managed by the Composer dependency manager.",
        }


def setup_requirements(repo_path: str) -> dict:
    """
    Run all of the functions needed before security checker can be run.
    :param: repo_path: string with path to working directory
    :return: dictionary
    """
    args = parse_args()
    secrets_results = utils.get_secret_with_status(args.secret_name, log)

    if secrets_results["status"]:
        auth_success = build_auth_json(secrets_results, repo_path)
    else:
        auth_success = False
        log.info("Secret results status not found. Only returning composer_install results")
    composer_result = composer_install(repo_path)

    return {
        "build_auth_json": auth_success,
        "composer_install": composer_result["success"],
        "composer_info": composer_result["details"],
    }
