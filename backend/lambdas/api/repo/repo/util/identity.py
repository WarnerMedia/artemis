class Identity:
    def __init__(
        self,
        principal_id: str,
        scope: list[list[list[str]]],
        features: dict,
        scheduler: bool = False,
        principal_type: str = None,
        allowlist_denied: list = None,
    ) -> None:
        super().__init__()

        self.principal_id = principal_id
        self.principal_type = principal_type
        self.scope = scope
        self.features = features
        self.scheduler = scheduler
        self.allowlist_denied = allowlist_denied or []
