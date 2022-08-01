"""
Constant variables used within the repo_queue module.
"""

import os

ORG_QUEUE = os.environ.get("ORG_QUEUE")
REPO_QUEUE = os.environ.get("REPO_QUEUE")
REGION = os.environ.get("REGION", "us-east-1")
