import json
from http import HTTPStatus

from artemisapi.const import DEFAULT_RESPONSE_MESSAGE_OVERRIDES

SECURITY_HEADERS = {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Option": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
}


def response(msg=None, code: HTTPStatus = HTTPStatus.OK, json_body=True, headers=None, content_type=None):
    if headers is None:
        headers = {}
    if content_type is None:
        headers.update({"Content-Type": "application/json" if json_body else "text/html"})
    else:
        headers.update({"Content-Type": content_type})

    headers.update(SECURITY_HEADERS)

    if msg is None and code != HTTPStatus.NO_CONTENT:
        if code in DEFAULT_RESPONSE_MESSAGE_OVERRIDES:
            msg = {"message": DEFAULT_RESPONSE_MESSAGE_OVERRIDES[code]}
        else:
            msg = {"message": code.phrase}

    if msg is not None:
        return {
            "isBase64Encoded": "false",
            "statusCode": code.value,
            "headers": headers,
            "body": json.dumps(msg) if json_body else msg,
        }
    return {"isBase64Encoded": "false", "statusCode": code.value}
