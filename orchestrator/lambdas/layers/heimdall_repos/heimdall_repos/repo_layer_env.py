BITBUCKET_PUBLIC_ORG_QUERY = "$service_url/repositories/$org?page=$cursor"

BITBUCKET_PRIVATE_ORG_QUERY = "$service_url/projects/$org/repos?start=$cursor"

BITBUCKET_PUBLIC_REPO_QUERY = "$service_url/repositories/$org/$repo?page=$cursor"

BITBUCKET_PRIVATE_REPO_QUERY = "$service_url/projects/$org/repos/$repo?start=$cursor"

BITBUCKET_PUBLIC_BRANCH_QUERY = "$service_url/repositories/$org/$repo/refs/branches?page=$cursor"

BITBUCKET_PRIVATE_BRANCH_QUERY = "$service_url/projects/$org/repos/$repo/branches?start=$cursor"

BITBUCKET_PUBLIC_SPECIFIC_BRANCH_QUERY = "$service_url/repositories/$org/$repo/refs/branches?page=$cursor&name=$branch"

BITBUCKET_PRIVATE_SPECIFIC_BRANCH_QUERY = "$service_url/projects/$org/repos/$repo/branches?start=$cursor&name=$branch"

GITLAB_REPO_QUERY = """
{
    group(fullPath: "%s") {
        projects(first: 100,
                 after: %s,
                 includeSubgroups: true) {
            nodes {
                fullPath
                id
                visibility
                repository {
                    rootRef
                }
            }
            pageInfo {
                endCursor
                hasNextPage
            }
        }
    }
}
"""

GITHUB_REPO_QUERY = """
{
    organization(login: "%s") {
        repositories(first: 75,
                     after: %s,
                     orderBy: {field: NAME, direction: ASC}) {
            nodes {
                name
                defaultBranchRef {
                    name
                    target {
                        ... on Commit {
                            committedDate
                        }
                    }
                }
                isPrivate
                refs(first: 75, refPrefix:"refs/heads/", direction: ASC) {
                    nodes {
                        name
                        target {
                            ... on Commit {
                                committedDate
                            }
                        }
                    }
                    pageInfo {
                        endCursor
                        hasNextPage
                    }
                }
            }
            pageInfo {
                endCursor
                hasNextPage
            }
        }
    }
}
"""

GITHUB_REPO_REF_QUERY = """
{
    organization(login: "%s") {
        repository(name: "%s") {
            refs(first: 100, refPrefix:"refs/heads/", direction: ASC, after: "%s") {
                nodes {
                    name
                    target {
                        ... on Commit {
                            committedDate
                        }
                    }
                }
                pageInfo {
                    endCursor
                    hasNextPage
                }
            }
        }
    }
}
"""

GITHUB_RATE_ABUSE_FLAG = "rate_abuse"
# Last key added in an attempt to catch future iterations of the rate limiting.
GITHUB_RATE_ABUSE_KEYWORDS = ["abuse detection", "rate limit", "Please wait a few minutes before you try again."]

GITHUB_TIMEOUT_FLAG = "timeout"
GITHUB_TIMEOUT_KEYWORDS = ["timeout", "Something went wrong while executing your query."]
