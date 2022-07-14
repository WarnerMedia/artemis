from scan_scheduler.handler import handler as scan_scheduler


def handler(event, context):
    return scan_scheduler(event, context)
