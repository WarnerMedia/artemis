import argparse
import json
import sys
from datetime import datetime, timedelta, timezone
from json.decoder import JSONDecodeError

from api_runner.__version__ import __version__
from artemisapi.handler import handler as api_handler
from groups.handlers import handler as groups_handler
from groups_keys.handlers import handler as groups_keys_handler
from groups_members.handlers import handler as groups_members_handler
from repo.handlers import handler as repo_handler
from sbom_components.handlers import handler as sbom_components_handler
from sbom_licenses.handlers import handler as sbom_licenses_handler
from scans_batch.handlers import handler as scans_batch_handler
from search_repositories.handlers import handler as search_repositories_handler
from search_scans.handlers import handler as search_scans_handler
from search_vulnerabilities.handlers import handler as search_vulnerabilities_handler
from system_allowlist.handlers import handler as system_allowlist_handler
from system_status.handlers import handler as system_status_handler
from users.handlers import handler as users_handler
from users_keys.handlers import handler as users_keys_handler
from users_services.handlers import handler as users_services_handler

APIS = {
    "repo": {"handler": repo_handler, "kwargs": {}},
    "sbom_components": {"handler": sbom_components_handler, "kwargs": {}},
    "sbom_licenses": {"handler": sbom_licenses_handler, "kwargs": {}},
    "scans_batch": {"handler": scans_batch_handler, "kwargs": {}},
    "search_repositories": {"handler": search_repositories_handler, "kwargs": {}},
    "search_scans": {"handler": search_scans_handler, "kwargs": {}},
    "search_vulnerabilities": {"handler": search_vulnerabilities_handler, "kwargs": {}},
    "system_allowlist": {"handler": system_allowlist_handler, "kwargs": {}},
    "system_status": {"handler": system_status_handler, "kwargs": {"check_maintenance": False}},
    "users": {"handler": users_handler, "kwargs": {}},
    "users_keys": {"handler": users_keys_handler, "kwargs": {}},
    "users_services": {"handler": users_services_handler, "kwargs": {}},
    "groups": {"handler": groups_handler, "kwargs": {}},
    "groups_members": {"handler": groups_members_handler, "kwargs": {}},
    "groups_keys": {"handler": groups_keys_handler, "kwargs": {}},
}


def main():
    parser = argparse.ArgumentParser(description=f"API Runner {__version__}")

    parser.add_argument("--api", required=True, type=str, help="API to run")
    parser.add_argument("--method", required=True, type=str, help="HTTP method")
    parser.add_argument("--path", required=False, type=str, help="URL path")
    parser.add_argument("--args", required=False, type=str, help="URL query args", default="")
    parser.add_argument("--headers", required=False, type=str, help="Headers", default="")
    parser.add_argument("--body", required=False, type=str, help="Request body", default="")
    parser.add_argument("--username", required=False, type=str, help="User email", default="testuser@example.com")
    parser.add_argument(
        "--group_auth",
        required=False,
        type=str,
        help="Dictionary with the group_id and group_admin key value pair",
        default="{}",
    )
    parser.add_argument("--scope", required=False, type=str, help="User's group scopes", default='[[["*"]]]')
    parser.add_argument("--features", required=False, type=str, help="User's consolidated group features", default="{}")
    parser.add_argument("--path-params", required=False, type=str, help="Path parameters", default=None)
    parser.add_argument("--admin", required=False, action="store_true", help="Whether the user has admin permissions")
    parser.add_argument(
        "--scheduler", required=False, action="store_true", help="Whether the user has scheduler permissions"
    )
    parser.add_argument(
        "--maintenance", required=False, action="store_true", help="Whether Artemis is in maintenance mode"
    )
    parser.add_argument("--principal-type", required=False, type=str, help="Principal type", default="user")
    parser.add_argument(
        "--allowlist-denied", required=False, type=str, help="List of scopes where allowlisting is denied", default="[]"
    )

    args = parser.parse_args()

    if args.api not in APIS:
        print(f"Unsupported API: {args.api}")
        sys.exit(1)

    response = api_handler(
        build_lambda_event(args), build_lambda_context(), APIS[args.api]["handler"], **APIS[args.api]["kwargs"]
    )

    if "body" in response:
        try:
            # Try to decide the JSON string embedded in the body field so that it prints nicer
            response["body"] = json.loads(response["body"])
        except JSONDecodeError:
            pass

    print(json.dumps(response, indent=2))


def build_lambda_event(args):
    header_dict = {}
    for header in list(filter(str.split, args.headers.split(";"))):
        split = header.split(":", maxsplit=1)
        header_dict[split[0]] = split[1].strip()

    query_params = {}
    for param in list(filter(str.split, args.args.split("&"))):
        split = param.split("=", maxsplit=1)
        query_params[split[0]] = split[1]

    mv_query_params = {}
    for param in list(filter(str.split, args.args.split("&"))):
        split = param.split("=", maxsplit=1)
        if split[0] not in mv_query_params:
            mv_query_params[split[0]] = []
        mv_query_params[split[0]].append(split[1])
    return {
        "resource": args.path,
        "path": args.path,
        "httpMethod": args.method,
        "headers": header_dict,
        "queryStringParameters": query_params,
        "multiValueQueryStringParameters": mv_query_params,
        "pathParameters": json.loads(args.path_params) if args.path_params is not None else {"id": args.path},
        "body": args.body,
        "requestContext": {
            "authorizer": {
                "principal": json.dumps({"name": args.username, "id": args.username, "type": args.principal_type}),
                "group_auth": args.group_auth,
                "scope": args.scope,
                "features": args.features,
                "admin": "true" if args.admin else "false",
                "scheduler": args.scheduler,
                "maintenance_mode": "true" if args.maintenance else "false",
                "maintenance_mode_message": "Test message" if args.maintenance else None,
                "maintenance_mode_retry_after": datetime.isoformat(
                    datetime.utcnow().replace(tzinfo=timezone.utc) + timedelta(hours=1)
                )
                if args.maintenance
                else None,
                "allowlist_denied": args.allowlist_denied,
            },
            "identity": {"sourceIp": "127.0.0.1"},
        },
    }


def build_lambda_context():
    # Not used right now
    return {}
