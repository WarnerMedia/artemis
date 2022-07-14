class Details:
    def __init__(self, details: dict):
        self.repo = details["repo"]
        self.org = self.repo.split("/")[0]
        self.service = details.get("service", "github")
        self.callback_url = details.get("callback", {}).get("url")
        self.client_id = details.get("callback", {}).get("client_id")
        # Feature flags of the User/API key
        self.features = details.get("features", {})
