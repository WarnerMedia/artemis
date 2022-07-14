from artemisapi.handler import handler as api_handler
from users.handlers import handler as users_handler


def handler(event, context):
    return api_handler(event, context, users_handler)
