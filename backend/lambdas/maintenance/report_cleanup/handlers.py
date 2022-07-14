from report_cleanup.handlers import handler as report_cleanup_handler


def handler(event, context):
    return report_cleanup_handler(event, context)
