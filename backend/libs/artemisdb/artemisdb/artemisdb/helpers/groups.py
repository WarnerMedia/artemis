from datetime import datetime, timezone

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction

from artemisdb.artemisdb.models import APIKey, Group, GroupMembership, User
from artemisdb.artemisdb.paging import FilterMap, PageInfo, apply_filters
from artemislib.audit.logger import AuditLogger
from artemislib.logging import Logger

GROUP_MEMBER_BINDS = {"group__hidden": False, "group__deleted": False}
GROUP_BINDS = {"hidden": False}


class GroupsDBHelper:
    def __init__(self, audit: AuditLogger | None = None):
        self.log = Logger(__name__)
        self.group = Group
        self.group_members = GroupMembership
        self.user = User
        self.apikey = APIKey

        # For audit logging
        self.audit = audit

    def is_group_admin(self, principal_id, group_id) -> bool:
        try:
            # If the user is in the group, return their group admin status
            return self.group_members.objects.get(user__email=principal_id, group__group_id=group_id).group_admin
        except self.group_members.DoesNotExist:
            return False

    def is_group_member(self, principal_id, group_id) -> bool:
        return self.group_members.objects.filter(user__email=principal_id, group__group_id=group_id).exists()

    def get_group(self, group_id, admin=False):
        group_settings = {} if admin else GROUP_BINDS

        try:
            return self.group.objects.get(group_id=group_id, self_group=False, deleted=False, **group_settings)
        except self.group.DoesNotExist:
            return None

    def get_groups(self, principal_id: str, admin: bool, paging: PageInfo):
        map = FilterMap()
        map.add_string("name")
        map.add_string("description")
        map.add_string("parent__name", "parent")

        try:
            if admin:
                # If admin, get all the non-self groups
                qs = self.group.objects.filter(self_group=False, deleted=False)
            else:
                # If user is not admin, get all of the groups the user is a member of and the
                # child groups of all the groups the user is an admin of
                qs = self.user.objects.get(email=principal_id).groups.filter(
                    self_group=False, deleted=False
                ) | self.group.objects.filter(
                    self_group=False,
                    deleted=False,
                    parent_id__in=list(
                        self.group_members.objects.filter(user__email=principal_id, group_admin=True).values_list(
                            "group_id", flat=True
                        )
                    ),
                )
            return apply_filters(qs, filter_map=map, page_info=paging, default_order=["name"])
        except (self.group.DoesNotExist, self.user.DoesNotExist, self.apikey.DoesNotExist):
            return None

    def delete_group(self, group_id) -> bool:
        # Do all of the user deletion stuff in a transaction
        with transaction.atomic():
            try:
                # Get the group by ID assuming it is not already deleted or a self group
                group = self.group.objects.get(group_id=group_id, self_group=False, deleted=False)
            except Group.DoesNotExist:
                return False

            # Soft-delete the group and update the name to a unique string to prevent potential future conflicts if
            # the group is ever re-created
            old_name = group.name
            group.deleted = True
            group.name = f"{group.name}_DELETED_{int(datetime.now(timezone.utc).timestamp())}"
            group.save()

            # Hard delete all of the group's API keys
            group.apikey_set.all().delete()

        # This is outside the transaction so that if the transaction rolled back we don't log the audit event
        if group.deleted and self.audit:
            self.audit.group_deleted(group.group_id, old_name)

        return True

    def does_group_exist(self, name, parent):
        try:
            self.group.objects.get(parent=parent, name=name, self_group=False, deleted=False)
            return True
        except self.group.DoesNotExist:
            return False

    def create_group(
        self,
        user,
        parent,
        name,
        description,
        scope,
        features,
        allowlist,
        admin,
        locked: bool = False,
        hidden: bool = False,
    ):
        try:
            group = self.group.objects.create(
                parent=parent,
                name=name,
                description=description,
                scope=scope,
                created_by=user,
                features=features,
                allowlist=allowlist,
                admin=admin,
                locked=locked,
                hidden=hidden,
            )
            if self.audit:
                self.audit.group_created(group.group_id, name, scope, features, admin, allowlist)
            return group
        except DjangoValidationError as error:
            self.log.error("Error creating group:", error.message)
            return None

    def get_user(self, email):
        try:
            return self.user.objects.get(email=email, deleted=False)
        except self.user.DoesNotExist:
            return None

    # Group Members

    def create_group_member(self, group, user, group_admin):
        try:
            group_member = self.group_members.objects.create(group=group, user=user, group_admin=group_admin)
            if self.audit:
                self.audit.group_member_added(user.email, str(group.group_id), group.name, group_member.group_admin)
            return group_member
        except DjangoValidationError as error:
            self.log.error(f"Error creating group membership for group id {group.group_id}:", error.message)
            return None
