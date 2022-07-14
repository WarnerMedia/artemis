from http import HTTPStatus
from typing import Union

from artemisapi.response import response
from artemislib.datetime import format_http_date


def maintenance_check(event: dict) -> Union[dict, None]:
    maintenance = event["requestContext"]["authorizer"].get("maintenance_mode", "false") == "true"
    if maintenance:
        message = event["requestContext"]["authorizer"].get("maintenance_mode_message")
        retry_after = event["requestContext"]["authorizer"].get("maintenance_mode_retry_after")
        return response(
            msg={"maintenance": maintenance, "message": message},
            code=HTTPStatus.SERVICE_UNAVAILABLE,
            headers={"Retry-After": format_http_date(retry_after)} if retry_after else None,
        )
    return None
