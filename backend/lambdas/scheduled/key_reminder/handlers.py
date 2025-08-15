from key_reminder.handlers import handler as key_reminder


def handler(event, context):
    return key_reminder(event, context)
