import json
from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from sbom_components.post import post


@pytest.fixture
def mock_scope():
    mock_repo = MagicMock()
    mock_repo.values_list.return_value = [1, 2]
    return mock_repo


@pytest.fixture
def event_json():
    return {"body": json.dumps(["express:4.16.4", "lodash"]), "headers": {}}


@patch("sbom_components.post.connection")
@patch("sbom_components.post.Repo")
@patch("sbom_components.post.response")
def test_post_success(mock_response, mock_Repo, mock_connection, event_json, mock_scope):
    mock_Repo.in_scope.return_value = mock_scope
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [
        (
            "github",
            "repo1",
            "express",
            "4.16.4",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
        (
            "bitbucket",
            "repo2",
            "lodash",
            None,
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
    ]
    mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

    # Mock response to just return its input for easier assertion
    mock_response.side_effect = lambda x, **kwargs: x

    result = post(event_json, '[[["*"]]]')

    assert "repos" in result

    assert {
        "service": "github",
        "repo": "repo1",
        "name": "express",
        "version": "4.16.4",
        "component_type": "npm",
        "last_scan": "2026-01-01T19:43:24.978979+00:00",
    } in result["repos"]

    assert {
        "service": "bitbucket",
        "repo": "repo2",
        "name": "lodash",
        "version": None,
        "component_type": "npm",
        "last_scan": "2026-01-01T19:43:24.978979+00:00",
    } in result["repos"]


@patch("sbom_components.post.connection")
@patch("sbom_components.post.Repo")
@patch("sbom_components.post.response")
def test_post_sorts_results_by_semantic_version(mock_response, mock_Repo, mock_connection, mock_scope):
    mock_Repo.in_scope.return_value = mock_scope
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [
        (
            "github",
            "repo-unversioned",
            "component",
            "1.3",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
        (
            "github",
            "repo-110",
            "component",
            "1.10.0",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
        (
            "github",
            "repo-12",
            "component",
            "1.2.0",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
        (
            "github",
            "repo-unversioned",
            "component",
            "1.1",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
    ]
    mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
    mock_response.side_effect = lambda x, **kwargs: x

    result = post({"body": json.dumps(["component"]), "headers": {}}, '[[["*"]]]')

    assert [repo["version"] for repo in result["repos"]] == ["1.10.0", "1.3", "1.2.0", "1.1"]


@patch("sbom_components.post.connection")
@patch("sbom_components.post.Repo")
@patch("sbom_components.post.response")
def test_post_sorts_npm_prerelease_versions(mock_response, mock_Repo, mock_connection, mock_scope):
    mock_Repo.in_scope.return_value = mock_scope
    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [
        ("github", "repo-release", "component", "5.0.1", "npm", datetime.now(UTC)),
        (
            "github",
            "repo-canary",
            "component",
            "5.0.1-canary.17",
            "npm",
            datetime.now(UTC),
        ),
    ]
    mock_connection.cursor.return_value.__enter__.return_value = mock_cursor
    mock_response.side_effect = lambda x, **kwargs: x

    result = post({"body": json.dumps(["component"]), "headers": {}}, '[[["*"]]]')
    assert [repo["version"] for repo in result["repos"]] == ["5.0.1", "5.0.1-canary.17"]


@patch("sbom_components.post.Repo.in_scope")
@patch("sbom_components.post.connection")
@patch("sbom_components.post.response")
def test_post_scope_filter(mock_response, mock_connection, mock_in_scope, event_json):
    mock_in_scope.return_value.values_list.return_value = ["github", "repo1"]

    mock_cursor = MagicMock()
    mock_cursor.fetchall.return_value = [
        (
            "github",
            "repo1",
            "express",
            "4.16.4",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        )
    ]
    mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

    # Mock response to just return its input for easier assertion
    mock_response.side_effect = lambda x, **kwargs: x

    scope = '[[["github/*"]]]'

    result = post(event_json, scope)

    # 1. Verify that Repo.in_scope was called with the correct scope
    mock_in_scope.assert_called_once_with(scope)

    # 2. Verify that values_list was called correctly
    mock_in_scope.return_value.values_list.assert_called_once_with("id", flat=True)

    # 3. Verify that the DB query was executed with the repo IDs from the scope
    sql, params = mock_cursor.execute.call_args.args
    assert "ar.id = ANY(%s)" in sql
    assert params[-1] == ["github", "repo1"]

    # 4. Verify the end result reflects the scoped data
    assert "repos" in result
    assert len(result["repos"]) == 1

    # We're mocking the data but let's verify anyway
    assert {
        "service": "github",
        "repo": "repo1",
        "name": "express",
        "version": "4.16.4",
        "component_type": "npm",
        "last_scan": "2026-01-01T19:43:24.978979+00:00",
    } in result["repos"]


@patch("sbom_components.post.connection")
@patch("sbom_components.post.Repo")
@patch("sbom_components.post.response")
def test_post_csv_output(mock_response, mock_Repo, mock_connection, mock_scope):
    event_csv = {"body": json.dumps(["express:4.16.4", "lodash"]), "headers": {"Accept": "text/csv"}}

    mock_Repo.in_scope.return_value = mock_scope
    mock_cursor = MagicMock()
    db_results = [
        (
            "github",
            "repo1",
            "express",
            "4.17.4",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
        (
            "bitbucket",
            "repo2",
            "lodash",
            "4.16.4",
            "npm",
            datetime.fromisoformat("2026-01-01T19:43:24.978979+00:00"),
        ),
    ]
    mock_cursor.fetchall.return_value = db_results
    mock_connection.cursor.return_value.__enter__.return_value = mock_cursor

    # Mock response to just return its input for easier assertion
    mock_response.side_effect = lambda body, content_type: {"body": body, "content_type": content_type}

    result = post(event_csv, '[[["*"]]]')

    expected_csv = "service,repo,name,version,component_type,last_scan\r\ngithub,repo1,express,4.17.4,npm,2026-01-01T19:43:24.978979+00:00\r\nbitbucket,repo2,lodash,4.16.4,npm,2026-01-01T19:43:24.978979+00:00\r\n"

    assert result["content_type"] == "text/csv"
    assert result["body"] == expected_csv
