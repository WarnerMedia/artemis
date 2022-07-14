from event_dispatch.event_dispatch import handler as event_dispatch_handler


def handler(event, context):
    return event_dispatch_handler(event, context)
