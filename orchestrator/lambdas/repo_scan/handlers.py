from repo_scan.repo_scan import run


def handler(event, context):
    return run(event, context)
