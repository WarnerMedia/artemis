from service_connection_metrics.handlers import handler as service_connection_metrics_handler


def handler(event, context):
    return service_connection_metrics_handler(event, context)
