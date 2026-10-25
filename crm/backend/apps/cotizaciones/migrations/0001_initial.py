import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("catalogo", "0001_initial"),
        ("clientes", "0001_initial"),
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Cotizacion",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("numero", models.CharField(db_index=True, max_length=40)),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("borrador", "Borrador"),
                            ("enviada", "Enviada"),
                            ("aceptada", "Aceptada"),
                            ("rechazada", "Rechazada"),
                            ("vencida", "Vencida"),
                        ],
                        default="borrador",
                        max_length=20,
                    ),
                ),
                ("fecha_emision", models.DateField()),
                ("fecha_vencimiento", models.DateField(blank=True, null=True)),
                ("notas", models.TextField(blank=True, default="")),
                ("subtotal", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("iva_total", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("total", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "cliente",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="cotizaciones", to="clientes.cliente"),
                ),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="empresas.empresa"),
                ),
            ],
            options={
                "db_table": "crm_cotizaciones",
                "ordering": ["-fecha_emision", "-id"],
                "unique_together": {("empresa", "numero")},
            },
        ),
        migrations.CreateModel(
            name="CotizacionItem",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("descripcion", models.CharField(max_length=300)),
                ("cantidad", models.DecimalField(decimal_places=2, default=Decimal("1"), max_digits=12)),
                ("precio_unitario", models.DecimalField(decimal_places=2, max_digits=14)),
                ("descuento_porcentaje", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=5)),
                ("iva_porcentaje", models.DecimalField(decimal_places=2, default=Decimal("19"), max_digits=5)),
                ("subtotal_linea", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("iva_linea", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("total_linea", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("orden", models.PositiveSmallIntegerField(default=0)),
                (
                    "cotizacion",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="cotizaciones.cotizacion"),
                ),
                (
                    "producto",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="catalogo.producto"),
                ),
            ],
            options={"db_table": "crm_cotizacion_items", "ordering": ["orden", "id"]},
        ),
    ]
