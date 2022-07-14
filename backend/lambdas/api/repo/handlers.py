from artemisapi.handler import handler as api_handler
from repo.handlers import handler as repo_handler


def handler(event, context):
    return api_handler(event, context, repo_handler)
