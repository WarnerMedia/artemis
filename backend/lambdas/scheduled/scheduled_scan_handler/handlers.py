from scheduled_scan_handler.handler import handler as scheduled_scan_handler


def handler(event, context):
    return scheduled_scan_handler(event, context)
