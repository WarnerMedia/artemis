# Generated by Django 3.1.4 on 2021-03-04 09:47

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0008_scan_branch_last_commit_timestamp"),
    ]

    operations = [
        migrations.AddField(model_name="scan", name="diff_base", field=models.CharField(max_length=256, null=True)),
        migrations.AddField(model_name="scan", name="diff_compare", field=models.CharField(max_length=256, null=True)),
    ]
