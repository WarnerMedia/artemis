from artemisapi.handler import handler as api_handler
from users_services.handlers import handler as users_services_handler


def handler(event, context):
    return api_handler(event, context, users_services_handler)
