# Generated by Django 3.2.23 on 2024-01-03 16:24

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0047_auto_20231115_1408"),
    ]

    operations = [
        migrations.AlterField(
            model_name="component",
            name="version",
            field=models.CharField(max_length=256),
        ),
    ]
