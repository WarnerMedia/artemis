from sbom_report.handlers import handler as sbom_report_handler


def handler(event, context):
    return sbom_report_handler(event, context)
