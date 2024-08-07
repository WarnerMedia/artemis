# Generated by Django 3.2.12 on 2022-03-22 13:58

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0032_group_groupmembership"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="groups",
            field=models.ManyToManyField(through="artemisdb.GroupMembership", to="artemisdb.Group"),
        ),
        migrations.AlterField(
            model_name="scan",
            name="owner_group",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="artemisdb.group"),
        ),
    ]
