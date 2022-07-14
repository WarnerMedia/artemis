from artemisapi.handler import handler as api_handler
from search_repositories.handlers import handler as search_repositories_handler


def handler(event, context):
    return api_handler(event, context, search_repositories_handler)
