# Generated by Django 3.2.15 on 2022-10-03 14:34

import simplejson.encoder
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0041_pluginconfig"),
    ]

    operations = [
        migrations.AddField(
            model_name="scan",
            name="exclude_paths",
            field=models.JSONField(default=list, encoder=simplejson.encoder.JSONEncoder),
        ),
        migrations.AddField(
            model_name="scan",
            name="include_paths",
            field=models.JSONField(default=list, encoder=simplejson.encoder.JSONEncoder),
        ),
    ]
