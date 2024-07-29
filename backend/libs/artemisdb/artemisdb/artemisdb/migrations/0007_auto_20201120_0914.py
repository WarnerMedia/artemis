# Generated by Django 3.1 on 2020-11-20 09:14

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0006_user_deleted"),
    ]

    operations = [
        migrations.AddField(
            model_name="allowlistitem",
            name="created_by",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="artemisdb.user"),
        ),
        migrations.AddField(model_name="allowlistitem", name="expires", field=models.DateTimeField(null=True)),
        migrations.AddField(
            model_name="allowlistitem",
            name="reason",
            field=models.CharField(default="", max_length=512),
            preserve_default=False,
        ),
    ]
