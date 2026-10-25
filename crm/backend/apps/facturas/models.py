from __future__ import annotations

from decimal import Decimal

from django.db import models

from apps.clientes.models import Cliente
from apps.catalogo.models import Producto
from apps.cotizaciones.models import Cotizacion
from apps.empresas.models import TenantModel


class Factura(TenantModel):
    EST_BORRADOR = "borrador"
    EST_EMITIDA = "emitida"
    EST_PAGADA_PARCIAL = "pagada_parcial"
    EST_PAGADA = "pagada"
    EST_ANULADA = "anulada"
    ESTADO_CHOICES = (
        (EST_BORRADOR, "Borrador"),
        (EST_EMITIDA, "Emitida"),
        (EST_PAGADA_PARCIAL, "Pagada parcial"),
        (EST_PAGADA, "Pagada"),
        (EST_ANULADA, "Anulada"),
    )

    numero = models.CharField(max_length=40, db_index=True)
    cliente = models.ForeignKey(Cliente, on_delete=models.PROTECT, related_name="facturas")
    cotizacion = models.ForeignKey(
        Cotizacion,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="facturas",
    )
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default=EST_BORRADOR)
    fecha_emision = models.DateField()
    fecha_vencimiento = models.DateField(null=True, blank=True)
    notas = models.TextField(blank=True, default="")
    subtotal = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    iva_total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    total_pagado = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal("0"))
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_facturas"
        unique_together = (("empresa", "numero"),)
        ordering = ["-fecha_emision", "-id"]

    @property
    def saldo_pendiente(self) -> Decimal:
        return self.total - self.total_pagado


class FacturaItem(models.Model):
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE, related_name="items")
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
        db_table = "crm_factura_items"
        ordering = ["orden", "id"]


class Pago(models.Model):
    factura = models.ForeignKey(Factura, on_delete=models.CASCADE, related_name="pagos")
    fecha = models.DateField()
    monto = models.DecimalField(max_digits=14, decimal_places=2)
    metodo = models.CharField(max_length=50, blank=True, default="")
    referencia = models.CharField(max_length=100, blank=True, default="")
    notas = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_pagos"
        ordering = ["-fecha", "-id"]
