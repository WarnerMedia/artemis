from datetime import datetime

from artemislib.audit.consts import Action, EventType
from artemislib.datetime import format_timestamp, get_utc_datetime


class AuditEvent:
    def __init__(self, principal: str, source_ip: str, action: Action) -> None:
        self.type = EventType.GENERIC
        self.timestamp = get_utc_datetime()
        self.principal = principal
        self.source_ip = source_ip
        self.action = action
        self.details = {}

    def __str__(self) -> str:
        return f"{self.__class__.__name__}({format_timestamp(self.timestamp)}, {self.principal}, {self.action.value})"

    def to_dict(self) -> dict:
        return {
            "type": self.type.value,
            "action": self.action.value,
            "timestamp": format_timestamp(self.timestamp),
            "principal": self.principal,
            "source_ip": self.source_ip,
            "details": self.details,
        }


class UserAuditEvent(AuditEvent):
    def __init__(
        self,
        principal: str,
        source_ip: str,
        action: Action,
        user: str = None,
        scope: list[str] = None,
        features: dict = None,
        admin: bool = None,
    ) -> None:
        super().__init__(principal, source_ip, action)

        self.type = EventType.USER
        if user:
            self.details["id"] = user
        if scope is not None:
            self.details["scope"] = scope
        if features is not None:
            self.details["features"] = features
        if admin is not None:
            self.details["admin"] = admin


class APIKeyAuditEvent(AuditEvent):
    def __init__(
        self,
        principal: str,
        source_ip: str,
        action: Action,
        key_id: str,
        scope: list[str] = None,
        features: dict = None,
        admin: bool = None,
        expires: datetime = None,
        group_id: str = None,
        group_name: str = None,
    ) -> None:
        super().__init__(principal, source_ip, action)

        self.type = EventType.API_KEY
        self.details["id"] = key_id
        if scope is not None:
            self.details["scope"] = scope
        if features is not None:
            self.details["features"] = features
        if admin is not None:
            self.details["admin"] = admin
        if expires is not None:
            self.details["expires"] = format_timestamp(expires)
        if group_id is not None:
            self.details["group_id"] = group_id
        if group_name is not None:
            self.details["group_name"] = group_name

    def __str__(self) -> str:
        return f"{super().__str__()} key_id={self.details['id']}"


class AllowListAuditEvent(AuditEvent):
    def __init__(
        self,
        principal: str,
        source_ip: str,
        action: Action,
        al_id: str,
        service: str,
        repo: str,
        type: str = None,
        expires: datetime = None,
        value: dict = None,
        reason: str = None,
        severity: str = None,
    ) -> None:
        super().__init__(principal, source_ip, action)

        self.type = EventType.ALLOW_LIST
        self.details["id"] = al_id
        self.details["service"] = service
        self.details["repo"] = repo
        if type is not None:
            self.details["type"] = type
        if expires is not None:
            if expires == "":
                # This is a special case where the expiration has been deleted so include
                # the "expires" key in the details but with no value.
                self.details["expires"] = None
            else:
                self.details["expires"] = format_timestamp(expires)
        if value is not None:
            self.details["value"] = value
        if reason is not None:
            self.details["reason"] = reason
        if severity is not None:
            self.details["severity"] = severity

    def __str__(self) -> str:
        return (
            f"{super().__str__()} service={self.details['service']}, "
            f"repo={self.details['repo']}, id={self.details['id']}"
        )


class SystemAllowListAuditEvent(AuditEvent):
    def __init__(
        self,
        principal: str,
        source_ip: str,
        action: Action,
        al_id: str,
        type: str = None,
        value: dict = None,
        reason: str = None,
    ) -> None:
        super().__init__(principal, source_ip, action)

        self.type = EventType.SYSTEM_ALLOW_LIST
        self.details["id"] = al_id
        if type is not None:
            self.details["type"] = type
        if value is not None:
            self.details["value"] = value
        if reason is not None:
            self.details["reason"] = reason

    def __str__(self) -> str:
        return f"{super().__str__()} id={self.details['id']}"


class GroupAuditEvent(AuditEvent):
    def __init__(
        self,
        principal: str,
        source_ip: str,
        action: Action,
        group_id: str,
        name: str = None,
        parent_id: str = None,
        parent_name: str = None,
        scope: list[str] = None,
        features: dict = None,
        admin: bool = None,
        allowlist: bool = None,
    ) -> None:
        super().__init__(principal, source_ip, action)

        self.type = EventType.GROUP
        self.details["id"] = group_id
        if name is not None:
            self.details["name"] = name
        if parent_id is not None:
            self.details["parent_id"] = parent_id
        if parent_name is not None:
            self.details["parent_name"] = parent_name
        if scope is not None:
            self.details["scope"] = scope
        if features is not None:
            self.details["features"] = features
        if admin is not None:
            self.details["admin"] = admin
        if allowlist is not None:
            self.details["allowlist"] = allowlist

    def __str__(self) -> str:
        return f"{super().__str__()} group={self.details['id']}"


class GroupMemberAuditEvent(AuditEvent):
    def __init__(
        self,
        principal: str,
        source_ip: str,
        action: Action,
        user_id: str,
        group_id: str,
        name: str = None,
        admin: bool = None,
    ) -> None:
        super().__init__(principal, source_ip, action)

        self.type = EventType.GROUP
        self.details["id"] = group_id
        self.details["user_id"] = user_id
        if name is not None:
            self.details["name"] = name
        if admin is not None:
            self.details["admin"] = admin

    def __str__(self) -> str:
        return f"{super().__str__()} group={self.details['id']}, user={self.details['user_id']}"
