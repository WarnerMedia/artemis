from artemisapi.handler import handler as api_handler
from ci_tools.handlers import handler as ci_tools_handler


def handler(event, context):
    return api_handler(event, context, ci_tools_handler)
