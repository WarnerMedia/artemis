from artemisapi.handler import handler as api_handler
from system_status.handlers import handler as system_status_handler


def handler(event, context):
    # This API skips the maintenance check so that it can return status during maintenance
    return api_handler(event, context, system_status_handler, check_maintenance=False)
