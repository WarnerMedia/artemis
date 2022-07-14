from artemisapi.handler import handler as api_handler
from users_keys.handlers import handler as users_keys_handler


def handler(event, context):
    return api_handler(event, context, users_keys_handler)
