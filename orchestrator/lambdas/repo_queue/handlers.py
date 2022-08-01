from repo_queue.repo_queue import run


def handler(event, context):
    return run(event, context)
