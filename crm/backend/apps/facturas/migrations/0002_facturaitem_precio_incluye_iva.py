from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("facturas", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="facturaitem",
            name="precio_incluye_iva",
            field=models.BooleanField(default=True),
        ),
    ]
