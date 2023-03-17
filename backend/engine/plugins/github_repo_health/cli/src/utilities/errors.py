from enum import Enum


class ErrorCode(int, Enum):
    UNEXPECTED = 1
    NOT_FOUND = 2


class CodedException(Exception):
    def __init__(self, message, code):
        super().__init__(message)
        self.code = code


class GetRepositoryException(CodedException):
    def __init__(self, message):
        super().__init__(message, ErrorCode.NOT_FOUND)


class GetBranchException(CodedException):
    def __init__(self, message):
        super().__init__(message, ErrorCode.NOT_FOUND)
