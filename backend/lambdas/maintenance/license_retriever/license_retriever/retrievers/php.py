import requests

from artemislib.logging import Logger
from license_retriever.util.github import get_license

LOG = Logger(__name__)


def retrieve_php_licenses(name: str, _version: str) -> list:
    package_info = get_package_info(name)
    if not package_info:
        return []

    licenses = [license.lower() for license in package_info["packages"][name][0]["license"]]
    if not licenses and package_info["packages"][name][0]["homepage"].startswith("https://github.com"):
        repo_license = get_license(package_info["packages"][name][0]["homepage"])
        if repo_license:
            licenses.append(repo_license)
    return licenses


def get_package_info(name: str) -> dict:
    url = f"https://repo.packagist.org/p2/{name}.json"

    r = requests.get(url)
    if r.status_code == 200:
        return r.json()
    else:
        LOG.error("Unable to find package info for %s: HTTP %s", name, r.status_code)
        return {}
