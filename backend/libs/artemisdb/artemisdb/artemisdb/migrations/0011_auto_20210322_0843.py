# Generated by Django 3.1.7 on 2021-03-22 08:43

import django.db.models.deletion
from django.db import migrations, models

import artemisdb.artemisdb.consts


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0010_scan_diff_summary"),
    ]

    operations = [
        migrations.CreateModel(
            name="Engine",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("engine_id", models.CharField(max_length=64)),
                ("start_time", models.DateTimeField(null=True)),
                ("shutdown_time", models.DateTimeField(null=True)),
                (
                    "state",
                    models.CharField(
                        choices=[
                            (artemisdb.artemisdb.consts.EngineState["RUNNING"], "running"),
                            (artemisdb.artemisdb.consts.EngineState["SHUTDOWN_REQUESTED"], "shutdown_requested"),
                            (artemisdb.artemisdb.consts.EngineState["SHUTDOWN"], "shutdown"),
                            (artemisdb.artemisdb.consts.EngineState["TERMINATED"], "terminated"),
                        ],
                        max_length=64,
                    ),
                ),
            ],
        ),
        migrations.AlterField(model_name="scan", name="worker", field=models.CharField(max_length=64, null=True)),
        migrations.AddField(
            model_name="scan",
            name="engine",
            field=models.ForeignKey(null=True, on_delete=django.db.models.deletion.SET_NULL, to="artemisdb.engine"),
        ),
    ]
