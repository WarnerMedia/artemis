import os
from typing import Union
from gql import Client
from gql.transport.requests import RequestsHTTPTransport
from gql.dsl import DSLQuery, DSLSchema, dsl_gql, DSLVariableDefinitions, DSLVariable

from artemislib.github.app import GithubApp
from artemislib.logging import Logger

log = Logger(__name__)

APPLICATION = os.environ.get("APPLICATION", "artemis")


def get_token(org: str, github_secret: str) -> str:
    """
    Get a GitHub token for a given org
    """
    # Attempt to get an app installation token for the organization
    github_app = GithubApp()
    token = github_app.get_installation_token(org)
    if token is not None:
        return f"token {token}"

    # Fall back to getting the PAT
    key = _get_api_key(github_secret)
    return f"bearer {key}"

def query_users_for_org(authorization: str, github_users: list, org: str) -> Union[bool, dict]:
    """
    Given a list of GitHub users, determine if each is/is not part of a given org
    """
    client = _get_client(authorization)
    with client as session:
        query, variables = _build_queries(client, org, github_users)

        result = session.execute(query, variable_values=variables, get_execution_result=True)
        return result


def _get_client(authorization):
    headers = {"accept": "application/vnd.github.v3+json", "authorization": f"{authorization}"}
    transport = RequestsHTTPTransport(url="https://api.github.com/graphql", headers=headers)
    return Client(transport=transport, fetch_schema_from_transport=True)


def _build_queries(client, org, github_users):
    user_queries = []
    variables = {"org": org}
    assert client.schema is not None

    ds = DSLSchema(client.schema)
    var_defs = DSLVariableDefinitions()
    for github_user in github_users:
        variables.update({github_user["query_name"]:github_user["username"]})
        # This is kind of hacky but it won't let us dynamically set vars otherwise.
        var_defs.variables[github_user["query_name"]] = DSLVariable(github_user["query_name"])
        user_queries.append((
            ds.Query.user
            .args(login=var_defs.variables[github_user["query_name"]])
            .alias(github_user["query_name"])
            .select(ds.User.organization.args(login=var_defs.org)
                .select(ds.Organization.login)
            )
        ))

    operation = DSLQuery(*user_queries)
    operation.variable_definitions = var_defs
    query = dsl_gql(operation)
    return query, variables


def _get_api_key(service_secret):
    from artemislib.aws import AWSConnect  # pylint: disable=import-outside-toplevel

    aws_connect = AWSConnect()
    secret = aws_connect.get_secret(f"{APPLICATION}/{service_secret}")
    if secret:
        return secret.get("key")
    return None
