from __future__ import annotations

from django.http import HttpResponse
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cotizaciones.models import Cotizacion
from apps.cotizaciones.pdf import cotizacion_pdf_bytes
from apps.cotizaciones.serializers import CotizacionSerializer
from apps.cotizaciones.services import recalcular_cotizacion
from apps.empresas.mixins import TenantViewSetMixin
from apps.empresas.permissions import IsTenantOperator


class CotizacionViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = CotizacionSerializer
    permission_classes = [IsAuthenticated, IsTenantOperator]
    queryset = Cotizacion.objects.select_related("cliente").prefetch_related("items")
    search_fields = ("numero", "cliente__razon_social")
    filterset_fields = ("estado", "cliente")
    ordering_fields = ("fecha_emision", "total", "created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_destroy(self, instance):
        if instance.estado != Cotizacion.EST_BORRADOR:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Solo se eliminan cotizaciones en borrador.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def enviar(self, request, pk=None):
        cot = self.get_object()
        if cot.estado != Cotizacion.EST_BORRADOR:
            return Response({"detail": "Solo borradores."}, status=status.HTTP_400_BAD_REQUEST)
        cot.estado = Cotizacion.EST_ENVIADA
        cot.save(update_fields=["estado"])
        return Response(CotizacionSerializer(cot, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def aceptar(self, request, pk=None):
        cot = self.get_object()
        if cot.estado not in (Cotizacion.EST_ENVIADA, Cotizacion.EST_BORRADOR):
            return Response({"detail": "Estado no válido."}, status=status.HTTP_400_BAD_REQUEST)
        cot.estado = Cotizacion.EST_ACEPTADA
        cot.save(update_fields=["estado"])
        return Response(CotizacionSerializer(cot, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def rechazar(self, request, pk=None):
        cot = self.get_object()
        if cot.estado != Cotizacion.EST_ENVIADA:
            return Response({"detail": "Solo cotizaciones enviadas."}, status=status.HTTP_400_BAD_REQUEST)
        cot.estado = Cotizacion.EST_RECHAZADA
        cot.save(update_fields=["estado"])
        return Response(CotizacionSerializer(cot, context={"request": request}).data)

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        cot = self.get_object()
        recalcular_cotizacion(cot)
        data = cotizacion_pdf_bytes(cot)
        response = HttpResponse(data, content_type="application/pdf")
        response["Content-Disposition"] = f'attachment; filename="{cot.numero}.pdf"'
        return response
