from django.contrib import admin

from apps.catalogo.models import Producto


@admin.register(Producto)
class ProductoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "precio", "empresa", "is_active")
