import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Empresa",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=200)),
                ("slug", models.SlugField(max_length=120, unique=True)),
                ("nit", models.CharField(blank=True, default="", max_length=50)),
                ("direccion", models.CharField(blank=True, default="", max_length=300)),
                ("telefono", models.CharField(blank=True, default="", max_length=50)),
                ("email", models.EmailField(blank=True, default="", max_length=254)),
                ("logo_url", models.URLField(blank=True, default="", max_length=500)),
                ("prefijo_cotizacion", models.CharField(default="COT", max_length=20)),
                ("prefijo_factura", models.CharField(default="FV", max_length=20)),
                ("is_active", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
            options={"db_table": "crm_empresas", "ordering": ["nombre"]},
        ),
        migrations.CreateModel(
            name="Consecutivo",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("tipo", models.CharField(choices=[("cotizacion", "Cotización"), ("factura", "Factura")], max_length=20)),
                ("anio", models.PositiveSmallIntegerField()),
                ("ultimo", models.PositiveIntegerField(default=0)),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="consecutivos", to="empresas.empresa"),
                ),
            ],
            options={"db_table": "crm_consecutivos", "unique_together": {("empresa", "tipo", "anio")}},
        ),
        migrations.CreateModel(
            name="Membresia",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "rol",
                    models.CharField(
                        choices=[("owner", "Propietario"), ("admin", "Administrador"), ("vendedor", "Vendedor")],
                        default="vendedor",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="membresias", to="empresas.empresa"),
                ),
                (
                    "user",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="membresias", to=settings.AUTH_USER_MODEL),
                ),
            ],
            options={"db_table": "crm_membresias", "unique_together": {("user", "empresa")}},
        ),
    ]
