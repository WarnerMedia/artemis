# Generated by Django 3.2.16 on 2023-03-06 12:27

import artemisdb.artemisdb.consts
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0042_auto_20221003_1434"),
    ]

    operations = [
        migrations.AlterField(
            model_name="allowlistitem",
            name="item_type",
            field=models.CharField(
                choices=[
                    (artemisdb.artemisdb.consts.AllowListType["CONFIGURATION"], "configuration"),
                    (artemisdb.artemisdb.consts.AllowListType["SECRET"], "secret"),
                    (artemisdb.artemisdb.consts.AllowListType["SECRET_RAW"], "secret_raw"),
                    (artemisdb.artemisdb.consts.AllowListType["VULN"], "vulnerability"),
                    (artemisdb.artemisdb.consts.AllowListType["VULN_RAW"], "vulnerability_raw"),
                    (artemisdb.artemisdb.consts.AllowListType["STATIC_ANALYSIS"], "static_analysis"),
                ],
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="plugin",
            name="type",
            field=models.CharField(
                choices=[
                    (artemisdb.artemisdb.consts.PluginType["CONFIGURATION"], "configuration"),
                    (artemisdb.artemisdb.consts.PluginType["INVENTORY"], "inventory"),
                    (artemisdb.artemisdb.consts.PluginType["VULN"], "vulnerability"),
                    (artemisdb.artemisdb.consts.PluginType["SECRETS"], "secrets"),
                    (artemisdb.artemisdb.consts.PluginType["STATIC_ANALYSIS"], "static_analysis"),
                ],
                max_length=64,
            ),
        ),
        migrations.AlterField(
            model_name="pluginresult",
            name="plugin_type",
            field=models.CharField(
                choices=[
                    (artemisdb.artemisdb.consts.PluginType["CONFIGURATION"], "configuration"),
                    (artemisdb.artemisdb.consts.PluginType["INVENTORY"], "inventory"),
                    (artemisdb.artemisdb.consts.PluginType["VULN"], "vulnerability"),
                    (artemisdb.artemisdb.consts.PluginType["SECRETS"], "secrets"),
                    (artemisdb.artemisdb.consts.PluginType["STATIC_ANALYSIS"], "static_analysis"),
                ],
                max_length=64,
            ),
        ),
    ]
