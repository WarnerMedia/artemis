# Generated by Django 3.1.7 on 2021-03-26 15:26

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0012_scan_errors"),
    ]

    operations = [migrations.RemoveField(model_name="scan", name="error_msg")]
