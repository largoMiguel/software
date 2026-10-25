from django.conf import settings
from django.db import migrations


def remove_platform_admin_membresias(apps, schema_editor):
    User = apps.get_model(*settings.AUTH_USER_MODEL.split("."))
    Membresia = apps.get_model("empresas", "Membresia")
    admin_ids = User.objects.filter(is_platform_admin=True).values_list("pk", flat=True)
    Membresia.objects.filter(user_id__in=admin_ids).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(remove_platform_admin_membresias, migrations.RunPython.noop),
    ]
