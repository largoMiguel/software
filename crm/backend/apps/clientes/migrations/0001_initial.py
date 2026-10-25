import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("empresas", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Cliente",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "tipo_documento",
                    models.CharField(
                        choices=[("nit", "NIT"), ("cc", "Cédula"), ("ce", "Cédula extranjería")],
                        default="nit",
                        max_length=10,
                    ),
                ),
                ("documento", models.CharField(db_index=True, max_length=50)),
                ("razon_social", models.CharField(max_length=200)),
                ("contacto_nombre", models.CharField(blank=True, default="", max_length=150)),
                ("email", models.EmailField(blank=True, default="", max_length=254)),
                ("telefono", models.CharField(blank=True, default="", max_length=50)),
                ("direccion", models.CharField(blank=True, default="", max_length=300)),
                ("notas", models.TextField(blank=True, default="")),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="empresas.empresa"),
                ),
            ],
            options={
                "db_table": "crm_clientes",
                "ordering": ["razon_social"],
                "unique_together": {("empresa", "tipo_documento", "documento")},
            },
        ),
    ]
