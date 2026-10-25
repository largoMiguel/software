from rest_framework import viewsets
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated

from apps.empresas.mixins import TenantViewSetMixin
from apps.empresas.permissions import IsTenantOperator
from apps.clientes.models import Cliente
from apps.clientes.serializers import ClienteSerializer


class ClienteViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ClienteSerializer
    permission_classes = [IsAuthenticated, IsTenantOperator]
    queryset = Cliente.objects.select_related("categoria")
    search_fields = ("razon_social", "documento", "email", "contacto_nombre")
    filterset_fields = ("is_active", "tipo_documento", "categoria")
    ordering_fields = ("razon_social", "created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_destroy(self, instance):
        if instance.facturas.exists() or instance.cotizaciones.exists():
            raise ValidationError(
                "No se puede eliminar: tiene cotizaciones o facturas. Desactívalo o elimina esos documentos."
            )
        instance.delete()
