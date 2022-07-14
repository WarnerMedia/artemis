from scans_batch.handlers import handler as scans_batch_handler

from artemisapi.handler import handler as api_handler


def handler(event, context):
    return api_handler(event, context, scans_batch_handler)
