# Generated by Django 3.1 on 2020-11-10 10:46

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0005_auto_20201104_1503"),
    ]

    operations = [
        migrations.AddField(model_name="user", name="deleted", field=models.BooleanField(default=False)),
    ]
