# Generated by Django 3.2.5 on 2021-12-01 16:09

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0025_auto_20211029_1059"),
    ]

    operations = [
        migrations.AddField(
            model_name="scan",
            name="qualified",
            field=models.BooleanField(default=False),
        ),
    ]
