from django.db.models import Q


def _q_or_list(q_filters: list) -> Q:
    # Start with an empty Q object
    filter = Q()

    # OR the filters together
    for q in q_filters:
        filter |= q

    return filter


def _q_and_list(q_filters: list) -> Q:
    # Start with an empty Q object
    filter = Q()

    # AND the filters together
    for q in q_filters:
        filter &= q

    return filter


def _group_filter(scopes: list[str]) -> Q:
    q_filters = []

    # Loop through the user's scopes
    for scope in scopes:
        # Split the service from the repo
        split = scope.split("/", maxsplit=1)

        if split[0]:
            # Convert the service scope glob into a regex
            service_regex = f"^{split[0].replace('*', '.*')}$"

        if len(split) == 2:
            # Convert the repo scope glob into a regex
            repo_regex = f"^{split[1].replace('*', '.*')}$"
        else:
            repo_regex = "^.*$"

        # Add a Q filter: service AND repo
        q_filters.append(Q(service__regex=service_regex) & Q(repo__regex=repo_regex))

    return _q_or_list(q_filters)


def group_chain_filter(group_chain: list[list[str]]) -> Q:
    q_filters = []
    for group in group_chain:
        q_filters.append(_group_filter(group))

    return _q_and_list(q_filters)
