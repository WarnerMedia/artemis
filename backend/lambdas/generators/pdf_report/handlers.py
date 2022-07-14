from pdf_report.handlers import handler as pdf_report_handler


def handler(event, context):
    return pdf_report_handler(event, context)
