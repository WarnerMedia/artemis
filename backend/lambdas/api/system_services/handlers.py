from artemisapi.handler import handler as api_handler
from system_services.handlers import handler as system_services_handler


def handler(event, context):
    return api_handler(event, context, system_services_handler)
