from string import Template


def get_service_url(service_dict: dict, graphql_url: bool = True) -> str or None:
    """
    Gets the graphql url or the traditional api url, depending on the need.
    TODO: Once this issue is closed, switch to only use graphql: https://gitlab.com/gitlab-org/gitlab/issues/207059
    :param service_dict: Dict info on the service. Includes the different urls
    :param graphql_url: Bool as to whether we need the graphql url or the api url.
    :return: str requested url or None if the service_dict is None
    """
    if not service_dict:
        return None
    if graphql_url:
        return service_dict.get("url")
    return service_dict.get("branch_url")


def handle_key(key, service_key) -> str or None:
    if not service_key:
        return key
    if service_key != "other":
        return Template(service_key).substitute(key=key)
    return None
