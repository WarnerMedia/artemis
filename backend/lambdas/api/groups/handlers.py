from artemisapi.handler import handler as api_handler
from groups.handlers import handler as groups_handler


def handler(event, context):
    return api_handler(event, context, groups_handler)
