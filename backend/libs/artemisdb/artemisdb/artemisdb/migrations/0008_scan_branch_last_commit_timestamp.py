# Generated by Django 3.1.4 on 2021-03-08 11:14

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0007_auto_20201120_0914"),
    ]

    operations = [
        migrations.AddField(
            model_name="scan",
            name="branch_last_commit_timestamp",
            field=models.DateTimeField(null=True),
        ),
    ]
