from json_report.handlers import handler as json_report_handler


def handler(event, context):
    return json_report_handler(event, context)
