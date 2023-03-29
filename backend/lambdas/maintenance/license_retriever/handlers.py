from license_retriever.handlers import handler as license_retriever_handler


def handler(event, context):
    return license_retriever_handler(event, context)
