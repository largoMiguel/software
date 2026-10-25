from django.contrib import admin

from apps.empresas.models import Consecutivo, Empresa, Membresia


@admin.register(Empresa)
class EmpresaAdmin(admin.ModelAdmin):
    list_display = ("nombre", "nit", "slug", "is_active")
    search_fields = ("nombre", "nit", "slug")


@admin.register(Membresia)
class MembresiaAdmin(admin.ModelAdmin):
    list_display = ("user", "empresa", "rol", "created_at")
    list_filter = ("rol",)


@admin.register(Consecutivo)
class ConsecutivoAdmin(admin.ModelAdmin):
    list_display = ("empresa", "tipo", "anio", "ultimo")
