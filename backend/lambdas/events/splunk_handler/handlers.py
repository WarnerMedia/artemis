from splunk_handler.handler import handler as splunk


def handler(event, context):
    return splunk(event, context)
