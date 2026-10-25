import django.core.validators
import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Producto",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("codigo", models.CharField(blank=True, default="", max_length=50)),
                ("nombre", models.CharField(max_length=200)),
                ("descripcion", models.TextField(blank=True, default="")),
                (
                    "tipo",
                    models.CharField(
                        choices=[("producto", "Producto"), ("servicio", "Servicio")],
                        default="servicio",
                        max_length=20,
                    ),
                ),
                ("precio", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                (
                    "iva_porcentaje",
                    models.DecimalField(
                        decimal_places=2,
                        default=Decimal("19"),
                        max_digits=5,
                        validators=[
                            django.core.validators.MinValueValidator(0),
                            django.core.validators.MaxValueValidator(100),
                        ],
                    ),
                ),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="empresas.empresa"),
                ),
            ],
            options={"db_table": "crm_productos", "ordering": ["nombre"]},
        ),
    ]
