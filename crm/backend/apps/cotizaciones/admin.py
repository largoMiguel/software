from django.contrib import admin

from apps.cotizaciones.models import Cotizacion, CotizacionItem


class ItemInline(admin.TabularInline):
    model = CotizacionItem
    extra = 0


@admin.register(Cotizacion)
class CotizacionAdmin(admin.ModelAdmin):
    list_display = ("numero", "empresa", "cliente", "estado", "total")
    inlines = [ItemInline]
