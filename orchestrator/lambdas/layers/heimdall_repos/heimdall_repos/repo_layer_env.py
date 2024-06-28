BITBUCKET_PUBLIC_ORG_QUERY = "$service_url/repositories/$org?page=$cursor"

BITBUCKET_PRIVATE_ORG_QUERY = "$service_url/projects/$org/repos?start=$cursor"

BITBUCKET_PUBLIC_REPO_QUERY = "$service_url/repositories/$org/$repo?page=$cursor"

BITBUCKET_PRIVATE_REPO_QUERY = "$service_url/projects/$org/repos/$repo?start=$cursor"

BITBUCKET_PUBLIC_BRANCH_QUERY = "$service_url/repositories/$org/$repo/refs/branches?page=$cursor"

BITBUCKET_PRIVATE_BRANCH_QUERY = "$service_url/projects/$org/repos/$repo/branches?start=$cursor"

BITBUCKET_PUBLIC_SINGLE_REPO_QUERY = "$service_url/repositories/$org/$repo/"

BITBUCKET_PRIVATE_SINGLE_REPO_QUERY = "$service_url/projects/$org/repos/$repo"

BITBUCKET_PUBLIC_DEFAULT_BRANCH_QUERY = "$service_url/repositories/$org/$repo/"

BITBUCKET_PRIVATE_DEFAULT_BRANCH_QUERY = "$service_url/projects/$org/repos/$repo/branches/default"

BITBUCKET_PUBLIC_COMMIT_QUERY = "$service_url/projects/$org/repos/$repo/commits/$commit"

BITBUCKET_PRIVATE_COMMIT_QUERY = "$service_url/projects/$org/repos/$repo/commits/$commit"

GITLAB_REPO_QUERY = """
query getLogin($org: ID!, $cursor: String) {
    group(fullPath: $org) {
        projects(first: 100,
                 after: $cursor,
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
query getRepos($org: String!, $cursor: String) {
    organization(login: $org) {
        repositories(first: 75, after: $cursor, orderBy: {field: NAME, direction: ASC}) {
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
                refs(first: 75, refPrefix: "refs/heads/", direction: ASC) {
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
query getRefs($org: String!, $repo: String!, $cursor: String) {
    organization(login: $org) {
        repository(name: $repo) {
            refs(first: 100, refPrefix: "refs/heads/", direction: ASC, after: $cursor) {
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
