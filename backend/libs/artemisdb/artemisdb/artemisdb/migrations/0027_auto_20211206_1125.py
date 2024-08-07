# Generated by Django 3.2.5 on 2021-12-06 11:25

import django.db.models.deletion
import simplejson.encoder
from django.db import migrations, models

import artemisdb.artemisdb.consts


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0026_scan_qualified"),
    ]

    operations = [
        migrations.AddField(
            model_name="apikey",
            name="scheduler",
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name="repo",
            name="risk",
            field=models.CharField(
                choices=[
                    (artemisdb.artemisdb.consts.RiskClassification["PRIORITY"], "priority"),
                    (artemisdb.artemisdb.consts.RiskClassification["CRITICAL"], "critical"),
                    (artemisdb.artemisdb.consts.RiskClassification["HIGH"], "high"),
                    (artemisdb.artemisdb.consts.RiskClassification["MEDIUM"], "moderate"),
                    (artemisdb.artemisdb.consts.RiskClassification["LOW"], "low"),
                ],
                max_length=32,
                null=True,
            ),
        ),
        migrations.CreateModel(
            name="ScanSchedule",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("schedule_id", models.UUIDField(unique=True)),
                ("name", models.CharField(max_length=64)),
                ("description", models.CharField(max_length=1024, null=True)),
                ("enabled", models.BooleanField(default=True)),
                ("interval_minutes", models.PositiveIntegerField(null=True)),
                ("day_of_week", models.PositiveSmallIntegerField(null=True)),
                ("day_of_month", models.PositiveSmallIntegerField(null=True)),
                ("next_scan_time", models.DateTimeField()),
                ("categories", models.JSONField(default=list, encoder=simplejson.encoder.JSONEncoder)),
                ("plugins", models.JSONField(default=list, encoder=simplejson.encoder.JSONEncoder)),
                ("depth", models.IntegerField(default=500)),
                ("include_dev", models.BooleanField(default=False)),
                ("owner", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.user")),
            ],
        ),
        migrations.CreateModel(
            name="RepoScanSchedule",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("ref", models.CharField(max_length=256, null=True)),
                ("repo", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.repo")),
                (
                    "schedule",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.scanschedule"),
                ),
            ],
            options={
                "unique_together": {("repo", "schedule", "ref")},
            },
        ),
        migrations.AddField(
            model_name="repo",
            name="schedules",
            field=models.ManyToManyField(through="artemisdb.RepoScanSchedule", to="artemisdb.ScanSchedule"),
        ),
        migrations.AddField(
            model_name="scan",
            name="schedule",
            field=models.ForeignKey(
                null=True, on_delete=django.db.models.deletion.SET_NULL, to="artemisdb.scanschedule"
            ),
        ),
    ]
