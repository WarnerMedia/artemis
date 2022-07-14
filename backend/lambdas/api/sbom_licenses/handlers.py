from artemisapi.handler import handler as api_handler
from sbom_licenses.handlers import handler as sbom_licenses_handler


def handler(event, context):
    return api_handler(event, context, sbom_licenses_handler)
