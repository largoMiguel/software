import django.db.models.deletion
from decimal import Decimal
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("catalogo", "0001_initial"),
        ("clientes", "0001_initial"),
        ("cotizaciones", "0001_initial"),
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Factura",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("numero", models.CharField(db_index=True, max_length=40)),
                (
                    "estado",
                    models.CharField(
                        choices=[
                            ("borrador", "Borrador"),
                            ("emitida", "Emitida"),
                            ("pagada_parcial", "Pagada parcial"),
                            ("pagada", "Pagada"),
                            ("anulada", "Anulada"),
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
                ("total_pagado", models.DecimalField(decimal_places=2, default=Decimal("0"), max_digits=14)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "cliente",
                    models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name="facturas", to="clientes.cliente"),
                ),
                (
                    "cotizacion",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="facturas",
                        to="cotizaciones.cotizacion",
                    ),
                ),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="empresas.empresa"),
                ),
            ],
            options={
                "db_table": "crm_facturas",
                "ordering": ["-fecha_emision", "-id"],
                "unique_together": {("empresa", "numero")},
            },
        ),
        migrations.CreateModel(
            name="FacturaItem",
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
                    "factura",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="items", to="facturas.factura"),
                ),
                (
                    "producto",
                    models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, to="catalogo.producto"),
                ),
            ],
            options={"db_table": "crm_factura_items", "ordering": ["orden", "id"]},
        ),
        migrations.CreateModel(
            name="Pago",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("fecha", models.DateField()),
                ("monto", models.DecimalField(decimal_places=2, max_digits=14)),
                ("metodo", models.CharField(blank=True, default="", max_length=50)),
                ("referencia", models.CharField(blank=True, default="", max_length=100)),
                ("notas", models.TextField(blank=True, default="")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "factura",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="pagos", to="facturas.factura"),
                ),
            ],
            options={"db_table": "crm_pagos", "ordering": ["-fecha", "-id"]},
        ),
    ]
