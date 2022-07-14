from http import HTTPStatus

DEFAULT_RESPONSE_MESSAGE_OVERRIDES = {
    HTTPStatus.BAD_REQUEST: "Invalid request",
    HTTPStatus.UNAUTHORIZED: "Unauthenticated",
    HTTPStatus.FORBIDDEN: "Unauthorized",
}
