from __future__ import annotations

from decimal import Decimal

from django.db import models

from apps.clientes.models import Cliente
from apps.catalogo.models import Producto
from apps.empresas.models import TenantModel


class Cotizacion(TenantModel):
    EST_BORRADOR = "borrador"
    EST_ENVIADA = "enviada"
    EST_ACEPTADA = "aceptada"
    EST_RECHAZADA = "rechazada"
    EST_VENCIDA = "vencida"
    ESTADO_CHOICES = (
        (EST_BORRADOR, "Borrador"),
        (EST_ENVIADA, "Enviada"),
        (EST_ACEPTADA, "Aceptada"),
        (EST_RECHAZADA, "Rechazada"),
        (EST_VENCIDA, "Vencida"),
    )

    numero = models.CharField(max_length=40, db_index=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="cotizaciones")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=EST_BORRADOR)
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True, default="")
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    iva_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_cotizaciones"
        unique_together = (("empresa", "numero"),)
        ordering = ["-fecha_emision", "-id"]

    def __str__(self) -> str:
        return self.numero


class CotizacionItem(models.Model):
    cotizacion = models.ForeignKey(Cotizacion, on_delete=models.CASCADE, related_name="items")
    producto = models.ForeignKey(Producto, null=True, blank=True, on_delete=models.SET_NULL)
    descripcion = models.CharField(max_length=300)
    cantidad = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("1"))
    precio_unitario = models.DecimalField(max_digits=14, decimal_places=2)
    precio_incluye_iva = models.BooleanField(default=True)
    descuento_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("0"))
    iva_porcentaje = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal("19"))
    subtotal_linea = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    iva_linea = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_linea = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    orden = models.PositiveSmallIntegerField(default=0)

    class Meta:
        db_table = "crm_cotizacion_items"
        ordering = ["orden", "id"]
