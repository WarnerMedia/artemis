from artemisapi.handler import handler as api_handler
from groups_members.handlers import handler as groups_members_handler


def handler(event, context):
    return api_handler(event, context, groups_members_handler)
