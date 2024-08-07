# Generated by Django 3.2.5 on 2021-12-06 11:25
import uuid

import django.db.models.deletion
import simplejson.encoder
from django.db import migrations, models


# create self groups for each user with scope and feature
def create_self_groups(apps, _):
    User = apps.get_model("artemisdb", "User")
    Group = apps.get_model("artemisdb", "Group")
    APIKey = apps.get_model("artemisdb", "APIKey")
    for user in User.objects.all():
        # create "self" group for each user and add user's scope and feature to this group
        self_group = Group.objects.create(
            name=user.email,
            description="self",
            created_by=user,  # The user is always recorded as the creator of the self group
            scope=user.scope,
            features=user.features,
            admin=user.admin,
            locked=True,
            hidden=True,
            self_group=True,
            allowlist=True,
        )
        # add group membership with "self" and the user
        self_group.groupmembership_set.create(user=user)
    # set apikey.group from null to the "self" group created for the user above.
    for apikey in APIKey.objects.all():
        apikey.group = Group.objects.get(created_by=apikey.user, self_group=True)
        apikey.save()


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0031_auto_20220225_1009"),
    ]

    operations = [
        migrations.CreateModel(
            name="Group",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("group_id", models.UUIDField(default=uuid.uuid4, unique=True)),
                ("name", models.CharField(max_length=64)),
                ("description", models.CharField(max_length=256, null=True)),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("updated", models.DateTimeField(auto_now=True)),
                ("scope", models.JSONField(encoder=simplejson.encoder.JSONEncoder)),
                ("features", models.JSONField(default=dict, encoder=simplejson.encoder.JSONEncoder)),
                ("allowlist", models.BooleanField(default=False)),
                ("admin", models.BooleanField(default=False)),
                ("hidden", models.BooleanField(default=False)),
                ("self_group", models.BooleanField(default=False)),
                ("locked", models.BooleanField(default=False)),
                ("deleted", models.BooleanField(default=False)),
                (
                    "created_by",
                    models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="artemisdb.user"),
                ),
                (
                    "parent",
                    models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="artemisdb.group"),
                ),
            ],
            options={
                "unique_together": {("parent", "name")},
            },
        ),
        migrations.CreateModel(
            name="GroupMembership",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("group_admin", models.BooleanField(default=False)),
                ("added", models.DateTimeField(auto_now_add=True)),
                ("group", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.group")),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.user")),
            ],
        ),
        migrations.AddField(
            model_name="apikey",
            name="group",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to="artemisdb.group"),
        ),
        migrations.AddField(
            model_name="scan",
            name="owner_group",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.CASCADE, to="artemisdb.group"),
        ),
        migrations.RunPython(code=create_self_groups, reverse_code=migrations.RunPython.noop),
    ]
