from update_github_org_users.handlers import handler as update_github_org_users_handler


def handler(event, context):
    return update_github_org_users_handler(event, context)
