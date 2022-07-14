from task_queue_metrics.handlers import handler as tqm_handler


def handler(event, context):
    return tqm_handler(event, context)
