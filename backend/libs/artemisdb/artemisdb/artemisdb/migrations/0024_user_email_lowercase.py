from django.db import migrations


# normalize all existing emails to lowercase
def set_user_email_lower(apps, schema_editor):
    users = apps.get_model("artemisdb", "User")
    for user in users.objects.all():
        user.email = user.email.lower()
        user.save()


class Migration(migrations.Migration):

    dependencies = [
        ("artemisdb", "0023_userservice"),
    ]
    operations = [
        migrations.RunPython(code=set_user_email_lower, reverse_code=migrations.RunPython.noop),
    ]
