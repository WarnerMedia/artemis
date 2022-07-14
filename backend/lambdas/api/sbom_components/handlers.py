from artemisapi.handler import handler as api_handler
from sbom_components.handlers import handler as sbom_components_handler


def handler(event, context):
    return api_handler(event, context, sbom_components_handler)
