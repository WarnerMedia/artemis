import csv
import io
import json
from http import HTTPStatus

from artemisapi.response import response
from artemisapi.validators import ValidationError
from artemisdb.artemisdb.models import Repo
from django.db import connection
from packaging.version import InvalidVersion, Version

from sbom_components.util.validators import validate_component_name, validate_component_version


def version_sort_key(component_version):
    if component_version is None:
        return Version("0")

    try:
        return Version(component_version)
    except InvalidVersion:
        return Version("1")


def post(event, scope):
    """POST request handler

    API Endpoints handled:
        /sbom/components/search -- Show all repos using the requested components
    """

    # Endpoint:
    #   /sbom/components/search
    # Expects JSON body:
    # [
    #   "express:4.16.4",
    #   "lodash"
    # ]
    # Return the list of repos containing the requested components.

    try:
        if not event["body"]:
            raise ValidationError("Missing body")

        body = json.loads(event["body"])
        if len(body) == 0:
            raise ValidationError("Missing list of packages in body")

        scope_repos = Repo.in_scope(scope)

        # Build list of (ecosystem, component, version) tuples
        package_tuples = []
        for row in body:
            if not isinstance(row, str):
                raise ValidationError("List of packages is invalid.")

            parts = row.split(":")
            component = parts[0] if len(parts) > 0 else None
            version = parts[1] if len(parts) > 1 else None

            validate_component_name(component)
            validate_component_version(version)

            package_tuples.append((component, version))

    except json.JSONDecodeError:
        return response(msg="Invalid JSON in body", code=HTTPStatus.BAD_REQUEST)

    except ValidationError as e:
        return response(msg=e.message, code=e.code)

    values = []
    params = []
    for comp, ver in package_tuples:
        values.append("(%s, %s)")
        params.extend([comp, ver])

    sql = f"""
    WITH package_input_set (p_name, p_version) AS (
        VALUES
            {", ".join(values)}
    )
    SELECT DISTINCT
        ar.service,
        ar.repo,
        c.name,
        c.version,
        c.component_type,
		s.end_time
    FROM
        artemisdb_repo ar
    JOIN
        artemisdb_repocomponentscan rcs ON ar.id = rcs.repo_id
    JOIN
        artemisdb_component c ON rcs.component_id = c.id
    JOIN
        artemisdb_scan s ON rcs.scan_id  = s.id
    JOIN
        package_input_set pis ON c.name = pis.p_name
    WHERE
        (pis.p_version IS NULL OR c.version = pis.p_version)
        AND ar.id = ANY(%s)
    ORDER BY c.version DESC;
    """
    params.append(list(scope_repos.values_list("id", flat=True)))

    with connection.cursor() as cursor:
        cursor.execute(sql, params)
        results = cursor.fetchall()

        # Sort in descending semantic version order, with unversioned components first.
        results = sorted(results, reverse=True, key=lambda result: version_sort_key(result[3]))

    if event.get("headers", {}).get("Accept", "") == "text/csv":
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["service", "repo", "name", "version", "component_type", "last_scan"])
        for service, repo, name, version, component_type, end_time in results:
            writer.writerow([service, repo, name, version, component_type, end_time.isoformat()])
        return response(output.getvalue(), content_type="text/csv")

    # Format results as list of dicts with all selected fields
    repos = [
        {
            "service": service,
            "repo": repo,
            "name": name,
            "version": version,
            "component_type": component_type,
            "last_scan": end_time.isoformat(),
        }
        for service, repo, name, version, component_type, end_time in results
    ]
    return response({"repos": repos})
