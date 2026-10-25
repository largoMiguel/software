from django.contrib import admin

from apps.facturas.models import Factura, FacturaItem, Pago


class ItemInline(admin.TabularInline):
    model = FacturaItem
    extra = 0


class PagoInline(admin.TabularInline):
    model = Pago
    extra = 0


@admin.register(Factura)
class FacturaAdmin(admin.ModelAdmin):
    list_display = ("numero", "empresa", "cliente", "estado", "total", "total_pagado")
    inlines = [ItemInline, PagoInline]
