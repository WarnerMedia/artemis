# Generated by Django 3.0.8 on 2020-08-14 10:23

import django.db.models.deletion
import simplejson.encoder
from django.db import migrations, models

import artemisdb.artemisdb.consts


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="Repo",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("repo", models.CharField(max_length=256)),
                ("service", models.CharField(max_length=256)),
            ],
            options={"unique_together": {("repo", "service")}},
        ),
        migrations.CreateModel(
            name="Scan",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("scan_id", models.UUIDField(unique=True)),
                ("ref", models.CharField(max_length=256, null=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            (artemisdb.artemisdb.consts.ScanStatus["QUEUED"], "queued"),
                            (artemisdb.artemisdb.consts.ScanStatus["PROCESSING"], "processing"),
                            (artemisdb.artemisdb.consts.ScanStatus["COMPLETED"], "completed"),
                            (artemisdb.artemisdb.consts.ScanStatus["FAILED"], "failed"),
                            (artemisdb.artemisdb.consts.ScanStatus["ERROR"], "error"),
                        ],
                        max_length=64,
                    ),
                ),
                ("progress", models.JSONField(default=dict, encoder=simplejson.encoder.JSONEncoder)),
                ("error_msg", models.TextField(null=True)),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("last_updated", models.DateTimeField(auto_now=True)),
                ("start_time", models.DateTimeField(null=True)),
                ("end_time", models.DateTimeField(null=True)),
                ("expires", models.DateTimeField(null=True)),
                ("worker", models.CharField(max_length=64)),
                ("repo", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.Repo")),
            ],
        ),
        migrations.CreateModel(
            name="AllowListItem",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("item_id", models.UUIDField()),
                (
                    "item_type",
                    models.CharField(
                        choices=[
                            (artemisdb.artemisdb.consts.AllowListType["SECRET"], "secret"),
                            (artemisdb.artemisdb.consts.AllowListType["SECRET_RAW"], "secret_raw"),
                            (artemisdb.artemisdb.consts.AllowListType["VULN"], "vulnerability"),
                            (artemisdb.artemisdb.consts.AllowListType["STATIC_ANALYSIS"], "static_analysis"),
                        ],
                        max_length=64,
                    ),
                ),
                ("value", models.JSONField(encoder=simplejson.encoder.JSONEncoder)),
                ("repo", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.Repo")),
            ],
        ),
        migrations.CreateModel(
            name="PluginResult",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("plugin_name", models.CharField(max_length=64)),
                (
                    "plugin_type",
                    models.CharField(
                        choices=[
                            (artemisdb.artemisdb.consts.PluginType["INVENTORY"], "inventory"),
                            (artemisdb.artemisdb.consts.PluginType["VULN"], "vulnerability"),
                            (artemisdb.artemisdb.consts.PluginType["SECRETS"], "secrets"),
                            (artemisdb.artemisdb.consts.PluginType["STATIC_ANALYSIS"], "static_analysis"),
                        ],
                        max_length=64,
                    ),
                ),
                ("start_time", models.DateTimeField()),
                ("end_time", models.DateTimeField()),
                ("success", models.BooleanField()),
                ("details", models.JSONField(encoder=simplejson.encoder.JSONEncoder)),
                ("errors", models.JSONField(default=list, encoder=simplejson.encoder.JSONEncoder)),
                ("scan", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.Scan")),
            ],
            options={"unique_together": {("scan", "plugin_name")}},
        ),
    ]
