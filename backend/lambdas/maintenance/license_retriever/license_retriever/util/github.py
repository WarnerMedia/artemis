import aiohttp


async def get_license(repo_url: str) -> str | None:
    # Get the license information for a GitHub repo asynchronously
    owner_repo = repo_url.replace("https://github.com/", "")
    url = f"https://api.github.com/repos/{owner_repo}"
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("license", {}).get("key")
    return None
