import logging
import os
import pathlib
import subprocess

from env import REV_PROXY_DOMAIN_SUBSTRING, REV_PROXY_SECRET, REV_PROXY_SECRET_HEADER, REV_PROXY_SECRET_REGION
from utils.engine import get_key

log = logging.getLogger(__name__)


def create_ssh_url(project_url: str):
    if "@" in project_url and project_url.endswith(".git") and ":" in project_url:
        return project_url
    split = 2
    if project_url.startswith("http"):
        split += 1

    url_list = project_url.split("/", split)
    log.info(url_list)
    # do stuff here
    result_url = ":".join([url_list[-2], url_list[-1]])
    if not result_url.endswith(".git"):
        result_url += ".git"
    if "@" not in result_url:
        result_url = "git@" + result_url
    log.info(result_url)
    return result_url


def git_clone(
    working_dir: str,
    service_ssh_key: str,
    service_name: str,
    project_url: str,
    branch: str,
    ssh_deploy_agent: str = "/ssh-agent.sh",
) -> bool:
    base = os.path.join(working_dir, "base")
    os.makedirs(base, exist_ok=True)
    prepare_ssh_file_system()
    if not os.path.exists(ssh_deploy_agent):
        log.error("ssh deploy agent file not found! Repo cannot be pulled.")
        return False
    if REV_PROXY_DOMAIN_SUBSTRING and REV_PROXY_DOMAIN_SUBSTRING in project_url:
        rev_proxy_key = get_key(REV_PROXY_SECRET, REV_PROXY_SECRET_REGION)["SecretString"]
    else:
        rev_proxy_key = ""
    args = ["sh", ssh_deploy_agent, service_ssh_key, service_name, project_url, REV_PROXY_SECRET_HEADER, rev_proxy_key]
    if branch:
        args.append(branch)
    r = subprocess.run(args, cwd=base, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)

    if r.returncode != 0:
        log.error(r.stderr.decode("utf-8"))
        return False
    return True


def prepare_ssh_file_system():
    ssh_directory = "/root/.ssh"
    os.makedirs(ssh_directory, exist_ok=True)
    pathlib.Path(os.path.join(ssh_directory, "known_hosts")).touch(exist_ok=True)
