# Generated by Django 3.2.13 on 2022-05-26 15:03

import django.db.models.deletion
from django.db import migrations, models

import artemisdb.artemisdb.consts


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0037_systemallowlistitem"),
    ]

    operations = [
        migrations.CreateModel(
            name="Plugin",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=64, unique=True)),
                ("friendly_name", models.CharField(max_length=64)),
                (
                    "type",
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
            ],
        ),
        migrations.CreateModel(
            name="EnginePlugin",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("enabled", models.BooleanField(default=True)),
                ("engine", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.engine")),
                ("plugin", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.plugin")),
            ],
        ),
        migrations.AddField(
            model_name="engine",
            name="plugins",
            field=models.ManyToManyField(through="artemisdb.EnginePlugin", to="artemisdb.Plugin"),
        ),
    ]
