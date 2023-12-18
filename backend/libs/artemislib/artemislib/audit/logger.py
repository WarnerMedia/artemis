import os
from datetime import datetime

from artemislib.audit.consts import Action
from artemislib.audit.events import (
    AllowListAuditEvent,
    APIKeyAuditEvent,
    GroupAuditEvent,
    GroupMemberAuditEvent,
    UserAuditEvent,
)
from artemislib.aws import AWSConnect
from artemislib.logging import Logger

ENVIRONMENT = os.environ.get("ARTEMIS_ENVIRONMENT", "nonprod")
AUDIT_QUEUE = os.environ.get("ARTEMIS_AUDIT_QUEUE")

LOG = Logger(__name__)


class AuditLogger:
    def __init__(self, principal: str, source_ip: str) -> None:
        self.aws = AWSConnect()
        self.principal = principal
        self.source_ip = source_ip

    def _queue_event(self, event):
        LOG.info("Queuing %s", event)
        e = event.to_dict()
        if not AUDIT_QUEUE:
            LOG.error("No audit queue defined")
            LOG.debug(e)
            return
        e = event.to_dict()
        e["environment"] = ENVIRONMENT
        wrapped_event = {"type": "audit", "event": e}
        self.aws.queue_msg(queue=AUDIT_QUEUE, msg=wrapped_event)

    #
    # Audit events
    #

    # User audit events

    def user_login(self) -> None:
        self._queue_event(UserAuditEvent(principal=self.principal, source_ip=self.source_ip, action=Action.LOGIN))

    def user_created(self, user: str, scope: list[str], features: dict, admin: bool) -> None:
        self._queue_event(
            UserAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.CREATED,
                user=user,
                scope=scope,
                features=features,
                admin=admin,
            )
        )

    def user_modified(self, user: str, scope: list[str] = None, features: dict = None, admin: bool = None) -> None:
        self._queue_event(
            UserAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.MODIFIED,
                user=user,
                scope=scope,
                features=features,
                admin=admin,
            )
        )

    def user_deleted(self, user: str) -> None:
        self._queue_event(
            UserAuditEvent(principal=self.principal, source_ip=self.source_ip, action=Action.DELETED, user=user)
        )

    # API key audit events

    def key_login(self, key_id: str) -> None:
        self._queue_event(
            APIKeyAuditEvent(principal=self.principal, source_ip=self.source_ip, action=Action.LOGIN, key_id=key_id)
        )

    def key_created(
        self,
        key_id: str,
        scope: list[str],
        features: dict,
        admin: bool,
        expires: datetime,
        group_id: str,
        group_name: str,
    ) -> None:
        self._queue_event(
            APIKeyAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.CREATED,
                key_id=key_id,
                scope=scope,
                features=features,
                admin=admin,
                expires=expires,
                group_id=group_id,
                group_name=group_name,
            )
        )

    def key_deleted(self, key_id: str) -> None:
        self._queue_event(
            APIKeyAuditEvent(principal=self.principal, source_ip=self.source_ip, action=Action.DELETED, key_id=key_id)
        )

    # AllowList audit events

    def al_created(
        self, al_id: str, service: str, repo: str, type: str, expires: datetime, value: dict, reason: str, severity: str
    ) -> None:
        self._queue_event(
            AllowListAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.CREATED,
                al_id=al_id,
                service=service,
                repo=repo,
                type=type,
                expires=expires,
                value=value,
                reason=reason,
                severity=severity,
            )
        )

    def al_modified(
        self, al_id: str, service: str, repo: str, type: str, expires: datetime, value: dict, reason: str, severity: str
    ) -> None:
        self._queue_event(
            AllowListAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.MODIFIED,
                al_id=al_id,
                service=service,
                repo=repo,
                type=type,
                expires=expires,
                value=value,
                reason=reason,
                severity=severity,
            )
        )

    def al_deleted(
        self, al_id: str, service: str, repo: str, type: str, expires: datetime, value: dict, reason: str, severity: str
    ) -> None:
        self._queue_event(
            AllowListAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.DELETED,
                al_id=al_id,
                service=service,
                repo=repo,
                type=type,
                expires=expires,
                value=value,
                reason=reason,
                severity=severity,
            )
        )

    # SystemAllowList audit events

    def sal_created(self, al_id: str, type: str, value: dict, reason: str) -> None:
        self._queue_event(
            AllowListAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.CREATED,
                al_id=al_id,
                type=type,
                value=value,
                reason=reason,
            )
        )

    def sal_modified(self, al_id: str, type: str, value: dict, reason: str) -> None:
        self._queue_event(
            AllowListAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.MODIFIED,
                al_id=al_id,
                type=type,
                value=value,
                reason=reason,
            )
        )

    def sal_deleted(self, al_id: str, type: str, value: dict, reason: str) -> None:
        self._queue_event(
            AllowListAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.DELETED,
                al_id=al_id,
                type=type,
                value=value,
                reason=reason,
            )
        )

    # Group audit events

    def group_created(
        self, group_id: str, name: str, scope: list[str], features: dict, admin: bool, allowlist: bool
    ) -> None:
        self._queue_event(
            GroupAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.CREATED,
                group_id=group_id,
                name=name,
                scope=scope,
                features=features,
                admin=admin,
                allowlist=allowlist,
            )
        )

    def group_modified(
        self, group_id: str, name: str, scope: list[str], features: dict, admin: bool, allowlist: bool
    ) -> None:
        self._queue_event(
            GroupAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.MODIFIED,
                group_id=group_id,
                name=name,
                scope=scope,
                features=features,
                admin=admin,
                allowlist=allowlist,
            )
        )

    def group_deleted(self, group_id: str, name: str) -> None:
        self._queue_event(
            GroupAuditEvent(
                principal=self.principal, source_ip=self.source_ip, action=Action.DELETED, group_id=group_id, name=name
            )
        )

    # Group membership audit events

    def group_member_added(self, user_id: str, group_id: str, name: str, admin: bool) -> None:
        self._queue_event(
            GroupMemberAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.CREATED,
                user_id=user_id,
                group_id=group_id,
                name=name,
                admin=admin,
            )
        )

    def group_member_modified(self, user_id: str, group_id: str, name: str, admin: bool) -> None:
        self._queue_event(
            GroupMemberAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.MODIFIED,
                user_id=user_id,
                group_id=group_id,
                name=name,
                admin=admin,
            )
        )

    def group_member_removed(self, user_id: str, group_id: str, name: str) -> None:
        self._queue_event(
            GroupMemberAuditEvent(
                principal=self.principal,
                source_ip=self.source_ip,
                action=Action.DELETED,
                user_id=user_id,
                group_id=group_id,
                name=name,
            )
        )
