from __future__ import annotations

from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models

from apps.empresas.models import TenantModel


class Categoria(TenantModel):
    TIPO_PRODUCTO = "producto"
    TIPO_CLIENTE = "cliente"
    TIPO_CHOICES = (
        (TIPO_PRODUCTO, "Producto"),
        (TIPO_CLIENTE, "Cliente"),
    )

    nombre = models.CharField(max_length=120)
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_PRODUCTO)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_categorias"
        unique_together = (("empresa", "tipo", "nombre"),)
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre


class Producto(TenantModel):
    TIPO_PRODUCTO = "producto"
    TIPO_SERVICIO = "servicio"
    TIPO_CHOICES = (
        (TIPO_PRODUCTO, "Producto"),
        (TIPO_SERVICIO, "Servicio"),
    )

    categoria = models.ForeignKey(
        Categoria,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="productos",
    )
    codigo = models.CharField(max_length=50, blank=True, default="")
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, default="")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default=TIPO_SERVICIO)
    precio = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    iva_porcentaje = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("19"),
        validators=[MinValueValidator(0), MaxValueValidator(100)],
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_productos"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre
