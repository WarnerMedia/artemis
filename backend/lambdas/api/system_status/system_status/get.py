import os
from http import HTTPStatus
from string import Template

from artemisapi.response import response
from artemisdb.artemisdb.consts import EngineState
from artemisdb.artemisdb.models import Engine
from artemislib.datetime import format_http_date
from system_status.util.env import DOMAIN_NAME, MAINTENANCE_MODE, MAINTENANCE_MODE_MESSAGE, MAINTENANCE_MODE_RETRY_AFTER

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data")
MAINTENANCE_TEMPLATE = os.path.join(DATA_DIR, "maint.html.tmpl")
NORMAL_TEMPLATE = os.path.join(DATA_DIR, "normal.html.tmpl")


def get_json():
    """GET request handler

    API Endpoints handled:
        /system/status  -- System status
    """

    # Endpoints:
    #   /system/status
    # Returns the system status in JSON
    return response(
        msg={
            "maintenance": {"enabled": MAINTENANCE_MODE, "message": MAINTENANCE_MODE_MESSAGE},
            "engines": _engine_status(),
        },
        code=HTTPStatus.SERVICE_UNAVAILABLE if MAINTENANCE_MODE else HTTPStatus.OK,
        headers={"Retry-After": format_http_date(MAINTENANCE_MODE_RETRY_AFTER)}
        if MAINTENANCE_MODE and MAINTENANCE_MODE_RETRY_AFTER
        else None,
    )


def get_html():
    """GET request handler with user-friendly response

    API Endpoints handled:
        /system/status  -- System status
    """

    # Endpoints:
    #   /system/status
    # Returns the system status in HTML

    headers = None
    if MAINTENANCE_MODE:
        code = HTTPStatus.SERVICE_UNAVAILABLE
        with open(MAINTENANCE_TEMPLATE) as f:
            page = Template(f.read()).substitute(
                MAINTENANCE_MODE_MESSAGE=MAINTENANCE_MODE_MESSAGE,
                MAINTENANCE_MODE_RETRY_AFTER=MAINTENANCE_MODE_RETRY_AFTER
                if MAINTENANCE_MODE_RETRY_AFTER is not None
                else "TBD",
            )
        if MAINTENANCE_MODE_RETRY_AFTER:
            headers = {"Retry-After": format_http_date(MAINTENANCE_MODE_RETRY_AFTER)}
    else:
        code = HTTPStatus.OK
        with open(NORMAL_TEMPLATE) as f:
            page = Template(f.read()).substitute(DOMAIN_NAME=DOMAIN_NAME)

    return response(msg=page, code=code, headers=headers, json_body=False)


def _engine_status() -> dict:
    status = {"status": "OFFLINE", "count": 0}

    if MAINTENANCE_MODE:
        # Return the status before making a DB query
        return status

    status["count"] = Engine.objects.filter(state=EngineState.RUNNING.value).count()
    if status["count"] > 0:
        status["status"] = "OK"
    if status["count"] % 3 != 0:
        # Each engine EC2 instance starts 3 engine containers so count must be a multiple of 3
        status["status"] = "DEGRADED"

    # TODO: What else consititutes the engines being DEGRADED or FAILED?

    return status
