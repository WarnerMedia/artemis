import logging
import pytest
import subprocess
from pytest_httpserver import HTTPServer, RequestHandler
from typing import Tuple
from werkzeug.datastructures import MultiDict

LOGGER = logging.getLogger(__name__)

API_KEY = "test-key"
DEFAULT_ARGS = ["service", "repo", "main", "critical,high"]
SCAN_ID = "a909dc2b-59f9-4483-99e9-1de2e5d41459"

# Example analysis report to return from the status check request.
BASIC_ANALYSIS_REPORT = {
    "repo": "repo",
    "scan_id": SCAN_ID,
    "branch": "main",
    "initiated_by": "system",
}


def _run_script(
    httpserver: HTTPServer, args: list[str] = DEFAULT_ARGS, env: dict[str, str] = {}
) -> Tuple[str, str, int]:
    """
    Runs the artemis-scan.sh script with the test HTTP server.

    Returns the captured stdout, stderr, and exit code.
    """
    merged_env = {
        "ARTEMIS_API": httpserver.url_for("/api/v1"),
        "ARTEMIS_API_KEY": API_KEY,
        "ARTEMIS_STATUS_INTERVAL": "0",  # Don't wait between status checks.
    } | env
    LOGGER.info(merged_env)
    proc = subprocess.run(args=["ci-tools/shell/artemis-scan.sh", *args], env=merged_env, capture_output=True)
    return (proc.stdout.decode("utf-8"), proc.stderr.decode("utf-8"), proc.returncode)


def _expect_scan_req(httpserver: HTTPServer) -> RequestHandler:
    """
    Registers an expected scan request.

    Returns the request handler.
    """
    return httpserver.expect_ordered_request(method="POST", uri="/api/v1/service/repo", headers={"x-api-key": API_KEY})


def _expect_status_req(httpserver: HTTPServer) -> RequestHandler:
    """
    Registers an expected status request.

    Returns the request handler.
    """
    return httpserver.expect_ordered_request(
        method="GET",
        uri=f"/api/v1/service/{SCAN_ID}",
        headers={"x-api-key": API_KEY},
        query_string=MultiDict(
            [
                ("format", "summary"),
                ("results", "vulnerabilities"),
                ("results", "secrets"),
                ("results", "static_analysis"),
                ("severity", "critical"),
                ("severity", "high"),
            ]
        ),
    )


def test_missing_opts(httpserver: HTTPServer):
    """
    Test when no arguments are passed, the usage is printed.
    """
    (out, err, ret) = _run_script(httpserver, args=[])
    assert err == ""
    assert out.find("Positional arguments:") >= 0
    assert ret != 0


def test_missing_api_key(httpserver: HTTPServer):
    """
    Test when ARTEMIS_API_KEY is not set.
    """
    (out, err, ret) = _run_script(httpserver, env={"ARTEMIS_API_KEY": ""})
    assert err == ""
    assert out.find("environment variable is not set") >= 0
    assert ret != 0


def test_unauthorized(httpserver: HTTPServer):
    """
    Test when API key is rejected.
    """
    _expect_scan_req(httpserver).respond_with_json(status=403, response_json={"message": "unauthorized"})

    (out, err, ret) = _run_script(httpserver)
    assert err == ""
    assert out.find("Scan failed to start")
    assert ret != 0


@pytest.mark.parametrize("fail_closed,retcode", [(False, 0), (True, 1)])
def test_maintenance_mode(httpserver: HTTPServer, fail_closed: bool, retcode: int):
    """
    Test when maintenance mode is enabled on the server.
    """
    args = ["-c"] if fail_closed else []
    args += DEFAULT_ARGS

    _expect_scan_req(httpserver).respond_with_json(
        status=503, response_json={"maintenance": True, "message": "upgrading"}
    )

    (out, err, ret) = _run_script(httpserver, args=args)
    assert err == ""
    assert out.find("Artemis is in maintenance mode") >= 0
    assert ret == retcode


def test_queue_failed(httpserver: HTTPServer):
    """
    Test when the scan fails to be added to the queue.
    """
    _expect_scan_req(httpserver).respond_with_json(
        {"queued": [], "failed": [{"repo": "repo", "error": "error message"}]}
    )

    (out, err, ret) = _run_script(httpserver)
    assert err == ""
    assert out.find("Scan failed to start") >= 0
    assert ret != 0


@pytest.mark.parametrize("fail_closed,retcode", [(False, 0), (True, 1)])
def test_scan_maintenance_mode(httpserver: HTTPServer, fail_closed: bool, retcode: int):
    """
    Test when maintenance mode is activated during a scan.
    """
    args = ["-c"] if fail_closed else []
    args += DEFAULT_ARGS

    _expect_scan_req(httpserver).respond_with_json({"queued": [SCAN_ID], "failed": []})
    _expect_status_req(httpserver).respond_with_json(
        status=503, response_json={"maintenance": True, "message": "upgrading"}
    )

    (out, err, ret) = _run_script(httpserver, args=args)
    assert err == ""
    assert out.find("Artemis is in maintenance mode") >= 0
    assert ret == retcode


@pytest.mark.xfail(reason="Scan details are not valid JSON")
def test_scan_error(httpserver: HTTPServer):
    """
    Test a scan that was aborted due to an error.
    """
    _expect_scan_req(httpserver).respond_with_json({"queued": [SCAN_ID], "failed": []})
    _expect_status_req(httpserver).respond_with_json(
        BASIC_ANALYSIS_REPORT | {"status": "error"},
    )

    (out, err, ret) = _run_script(httpserver)
    assert err == ""
    assert out.find("Scan failed") >= 0
    assert ret != 0


def test_scan_completed_success(httpserver: HTTPServer):
    """
    Test a normal successful scan.
    """
    _expect_scan_req(httpserver).respond_with_json({"queued": [SCAN_ID], "failed": []})
    _expect_status_req(httpserver).respond_with_json(
        BASIC_ANALYSIS_REPORT | {"status": "queued"},
    )
    _expect_status_req(httpserver).respond_with_json(
        BASIC_ANALYSIS_REPORT
        | {
            "status": "completed",
            "success": True,
        },
    )

    (out, err, ret) = _run_script(httpserver)
    assert err == ""
    assert out.find("Scan status: completed") >= 0
    assert out.find("Analysis result: pass") >= 0
    assert ret == 0


def test_scan_completed_failed(httpserver: HTTPServer):
    """
    Test a normal scan with findings.
    """
    _expect_scan_req(httpserver).respond_with_json({"queued": [SCAN_ID], "failed": []})
    _expect_status_req(httpserver).respond_with_json(
        BASIC_ANALYSIS_REPORT | {"status": "queued"},
    )
    _expect_status_req(httpserver).respond_with_json(
        BASIC_ANALYSIS_REPORT
        | {
            "status": "completed",
            "success": False,
            "results_summary": {
                "vulnerabilities": {
                    "critical": 5,
                    "high": 4,
                    "medium": 3,
                    "low": 2,
                    "negligible": 1,
                },
                "secrets": 123,
                "static_analysis": {
                    "critical": 5,
                    "high": 4,
                    "medium": 3,
                    "low": 2,
                    "negligible": 1,
                },
            },
        },
    )

    (out, err, ret) = _run_script(httpserver)
    assert err == ""
    assert out.find("Scan status: completed") >= 0
    assert out.find("Analysis result: fail") >= 0
    assert ret != 0
