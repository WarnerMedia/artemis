from repo_scan_loop.main import handler as run


def handler(event, context):
    return run(event, context)
