import simplejson.encoder
from django.db import migrations, models


def migrate_error_msg(apps, schema_editor):
    scan = apps.get_model("artemisdb", "scan")
    for scan_object in scan.objects.filter(error_msg__isnull=False):
        scan_object.errors = [scan_object.error_msg]
        scan_object.save()


class Migration(migrations.Migration):

    dependencies = [
        ("artemisdb", "0011_auto_20210322_0843"),
    ]

    operations = [
        migrations.AddField(
            model_name="scan",
            name="errors",
            field=models.JSONField(default=list, encoder=simplejson.encoder.JSONEncoder, null=True),
        ),
        migrations.RunPython(migrate_error_msg),
    ]
