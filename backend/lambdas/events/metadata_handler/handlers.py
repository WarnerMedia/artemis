from metadata_handler.metadata_handler import handler as metadata_handler


def handler(event, context):
    return metadata_handler(event, context)
