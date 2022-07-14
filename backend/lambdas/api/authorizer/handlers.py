from authorizer.handlers import handler as api_handler


def handler(event, context):
    return api_handler(event, context)
