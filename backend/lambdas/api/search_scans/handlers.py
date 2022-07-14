from artemisapi.handler import handler as api_handler
from search_scans.handlers import handler as search_scans_handler


def handler(event, context):
    return api_handler(event, context, search_scans_handler)
