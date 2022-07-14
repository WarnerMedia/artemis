from django.db import migrations


def set_user_scope_lower(apps, schema_editor):
    users = apps.get_model("artemisdb", "User")
    for user in users.objects.exclude(scope=["*"]):
        user.scope = [scope.lower() for scope in user.scope]
        user.save()


class Migration(migrations.Migration):

    dependencies = [
        ("artemisdb", "0020_scan_application_metadata"),
    ]
    operations = [
        migrations.RunPython(set_user_scope_lower),
    ]
