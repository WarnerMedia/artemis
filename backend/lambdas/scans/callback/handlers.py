from callback.handlers import handler as callback_handler


def handler(event, context):
    return callback_handler(event, context)
