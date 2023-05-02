class ParsedEvent:
    def __init__(self, event):
        self.item_id = None

        params = event.get("pathParameters") or {}
        self.item_id = params.get("id")
