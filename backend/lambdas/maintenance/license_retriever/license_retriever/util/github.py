from typing import Union

import requests


def get_license(repo_url: str) -> Union[str, None]:
    # Get the license information for a GitHub repo
    owner_repo = repo_url.replace("https://github.com/", "")
    r = requests.get(f"https://api.github.com/repos/{owner_repo}")
    if r.status_code == 200:
        return r.json().get("license", {}).get("key")
    return None
