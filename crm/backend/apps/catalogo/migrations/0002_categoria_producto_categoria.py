import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("empresas", "0001_initial"),
        ("catalogo", "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="Categoria",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("nombre", models.CharField(max_length=120)),
                (
                    "tipo",
                    models.CharField(
                        choices=[("producto", "Producto"), ("cliente", "Cliente")],
                        default="producto",
                        max_length=20,
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "empresa",
                    models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to="empresas.empresa"),
                ),
            ],
            options={
                "db_table": "crm_categorias",
                "ordering": ["nombre"],
                "unique_together": {("empresa", "tipo", "nombre")},
            },
        ),
        migrations.AddField(
            model_name="producto",
            name="categoria",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="productos",
                to="catalogo.categoria",
            ),
        ),
    ]
