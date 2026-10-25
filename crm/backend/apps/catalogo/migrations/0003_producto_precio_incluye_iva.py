from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0002_categoria_producto_categoria"),
    ]

    operations = [
        migrations.AddField(
            model_name="producto",
            name="precio_incluye_iva",
            field=models.BooleanField(
                default=True,
                help_text="Si es verdadero, el precio de catalogo ya incluye IVA.",
            ),
        ),
    ]
