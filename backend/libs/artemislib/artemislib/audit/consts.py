from enum import Enum


class EventType(Enum):
    USER = "user"
    GROUP = "group"
    API_KEY = "api_key"
    ALLOW_LIST = "allowlist"
    GENERIC = "generic"
    SYSTEM_ALLOW_LIST = "system_allowlist"


class Action(Enum):
    CREATED = "created"
    MODIFIED = "modified"
    DELETED = "deleted"
    LOGIN = "login"
