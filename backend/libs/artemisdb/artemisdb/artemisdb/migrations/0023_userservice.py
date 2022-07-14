import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("artemisdb", "0022_auto_20210908_1129"),
    ]
    operations = [
        migrations.CreateModel(
            name="UserService",
            fields=[
                ("id", models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("service", models.CharField(max_length=256)),
                ("username", models.CharField(max_length=256)),
                ("scan_orgs", models.JSONField()),
                ("created", models.DateTimeField(auto_now_add=True)),
                ("user", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="artemisdb.user")),
            ],
            options={
                "unique_together": {("user", "service")},
            },
        ),
    ]
