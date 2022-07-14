from signin.handlers import handler as signin_handler


def handler(event, context):
    return signin_handler(event, context)
