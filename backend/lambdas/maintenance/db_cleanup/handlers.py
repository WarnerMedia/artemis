from db_cleanup.handlers import handler as db_cleanup_handler


def handler(event, context):
    return db_cleanup_handler(event, context)
