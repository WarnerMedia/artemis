"""
Constant variables used within the repo_queue module.
"""

import os
from heimdall_repos.ado import ADORepoProcessor
from heimdall_repos.bitbucket_utils import ProcessBitbucketRepos
from heimdall_repos.github_utils import ProcessGithubRepos
from heimdall_repos.gitlab_utils import ProcessGitlabRepos

ORG_QUEUE = os.environ.get("ORG_QUEUE")
REPO_QUEUE = os.environ.get("REPO_QUEUE")
REGION = os.environ.get("REGION", "us-east-1")
ORG_DLQ = os.environ.get("ORG_DEAD_LETTER_QUEUE")

SERVICE_PROCESSORS = {
    "github": ProcessGithubRepos,
    "gitlab": ProcessGitlabRepos,
    "bitbucket": ProcessBitbucketRepos,
    "ado": ADORepoProcessor,
}
