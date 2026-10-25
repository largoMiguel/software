from django.contrib import admin

from apps.clientes.models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = ("razon_social", "documento", "empresa", "is_active")
    search_fields = ("razon_social", "documento")
