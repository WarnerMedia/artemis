from artemisapi.handler import handler as api_handler
from search_vulnerabilities.handlers import handler as search_vulnerabilities_handler


def handler(event, context):
    return api_handler(event, context, search_vulnerabilities_handler)
