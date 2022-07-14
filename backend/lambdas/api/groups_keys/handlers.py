from artemisapi.handler import handler as api_handler
from groups_keys.handlers import handler as groups_keys_handler


def handler(event, context):
    return api_handler(event, context, groups_keys_handler)
