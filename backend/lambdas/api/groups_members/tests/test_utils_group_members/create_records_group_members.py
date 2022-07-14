import time

from artemisdb.artemisdb.helpers.groups import GroupsDBHelper

DEFAULT_TEST_GROUP_VALUES = {
    "description": "test_description",
    "scope": [],
    "features": {},
    "allowlist": False,
    "admin": False,
}


def create_groups(db_caller: GroupsDBHelper, user, parent, group_num: int):
    """
    creates the provided number of groups and returns a list of resulting groups.
    """
    groups = []
    for index in range(group_num):
        group_name = f"{time.time_ns()}_group_{index}"
        group = db_caller.create_group(user=user, parent=parent, name=group_name, **DEFAULT_TEST_GROUP_VALUES)
        groups.append(group)
    return groups


def create_user(db_caller: GroupsDBHelper, email, scope, features, admin):
    return db_caller.user.objects.create(email=email, scope=scope, features=features, admin=admin)


def create_group_members(db_caller: GroupsDBHelper, member_list: list):
    """
    creates group member records
    each dict in the list needs to have these records:
    - group: a group object
    - user: a user object
    - group_admin: whether the user is a group_admin
    returns None
    """
    for member in member_list:
        db_caller.group_members.objects.create(**member)
