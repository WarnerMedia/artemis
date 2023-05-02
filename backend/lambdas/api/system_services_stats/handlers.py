from artemisapi.handler import handler as api_handler
from system_services_stats.handlers import handler as system_services_stats_handler


def handler(event, context):
    return api_handler(event, context, system_services_stats_handler)
