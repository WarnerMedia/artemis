from scale_down.handlers import handler as scale_down_handler


def handler(event, context):
    return scale_down_handler(event, context)
