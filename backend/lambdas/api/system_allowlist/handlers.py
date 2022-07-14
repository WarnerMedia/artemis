from artemisapi.handler import handler as api_handler
from system_allowlist.handlers import handler as system_allowlist_handler


def handler(event, context):
    return api_handler(event, context, system_allowlist_handler)
