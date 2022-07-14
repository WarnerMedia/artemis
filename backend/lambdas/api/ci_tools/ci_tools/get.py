from http import HTTPStatus
from typing import Union

from artemisapi.response import response
from artemislib.aws import AWSConnect, ClientError

CONTENT_TYPES = {"shell/artemis-scan.sh": "text/x-sh"}


def get(event: str):
    """GET request handler

    API Endpoints handled:
        /ci-tools  -- Returns script
    """
    if event["path"] is None or event["path"] not in CONTENT_TYPES:
        return response(code=HTTPStatus.NOT_FOUND)

    file_contents = _get_file(event["path"])
    if file_contents is None:
        return response(code=HTTPStatus.NOT_FOUND)

    return response(file_contents, json_body=False, content_type=CONTENT_TYPES[event["path"]])


def _get_file(path: str) -> Union[str, None]:
    aws = AWSConnect()
    obj = aws.get_s3_object(f"ci-tools/{path}")
    try:
        return obj.get()["Body"].read().decode("utf-8")
    except ClientError:
        return None
