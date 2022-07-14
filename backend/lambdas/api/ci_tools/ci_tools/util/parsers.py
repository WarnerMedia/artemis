def parse_event(event):
    params = event.get("pathParameters") or {}
    return {"path": params.get("path", "").lower() or None}
