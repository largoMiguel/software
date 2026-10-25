from __future__ import annotations

import logging

from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.common.pdf import pdf_http_response
from apps.common.pdf_context import vendedor_display_name
from apps.cotizaciones.models import Cotizacion
from apps.facturas.models import Factura
from apps.facturas.pdf import factura_pdf_bytes
from apps.facturas.serializers import FacturaSerializer, PagoSerializer, RegistrarPagoSerializer
from apps.facturas.services import factura_desde_cotizacion, recalcular_factura
from apps.empresas.mixins import TenantViewSetMixin
from apps.empresas.permissions import IsTenantOperator


class FacturaViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = FacturaSerializer
    permission_classes = [IsAuthenticated, IsTenantOperator]
    queryset = Factura.objects.select_related("cliente", "cotizacion").prefetch_related("items", "pagos")
    search_fields = ("numero", "cliente__razon_social")
    filterset_fields = ("estado", "cliente", "cotizacion")
    ordering_fields = ("fecha_emision", "total", "created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    def perform_destroy(self, instance):
        if instance.estado != Factura.EST_BORRADOR:
            from rest_framework.exceptions import ValidationError

            raise ValidationError("Solo se eliminan facturas en borrador.")
        instance.delete()

    @action(detail=True, methods=["post"])
    def emitir(self, request, pk=None):
        factura = self.get_object()
        if factura.estado != Factura.EST_BORRADOR:
            return Response({"detail": "Solo borradores."}, status=status.HTTP_400_BAD_REQUEST)
        factura.estado = Factura.EST_EMITIDA
        factura.save(update_fields=["estado"])
        return Response(FacturaSerializer(factura, context={"request": request}).data)

    @action(detail=True, methods=["post"])
    def anular(self, request, pk=None):
        factura = self.get_object()
        if factura.estado == Factura.EST_ANULADA:
            return Response({"detail": "Ya anulada."}, status=status.HTTP_400_BAD_REQUEST)
        factura.estado = Factura.EST_ANULADA
        factura.save(update_fields=["estado"])
        return Response(FacturaSerializer(factura, context={"request": request}).data)

    @action(detail=True, methods=["post"], url_path="pagos")
    def registrar_pago(self, request, pk=None):
        factura = self.get_object()
        serializer = RegistrarPagoSerializer(data=request.data, context={"factura": factura})
        serializer.is_valid(raise_exception=True)
        pago = serializer.save()
        factura.refresh_from_db()
        return Response(
            {
                "pago": PagoSerializer(pago).data,
                "factura": FacturaSerializer(factura, context={"request": request}).data,
            },
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get"], url_path="pdf")
    def pdf(self, request, pk=None):
        factura = self.get_object()
        recalcular_factura(factura)
        try:
            data = factura_pdf_bytes(factura, vendedor_nombre=vendedor_display_name(request.user))
        except Exception:
            logging.getLogger(__name__).exception("PDF factura %s", factura.pk)
            return Response(
                {"detail": "No se pudo generar el PDF. Revisa los datos de la factura."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )
        inline = request.query_params.get("download") != "1"
        return pdf_http_response(data, f"{factura.numero}.pdf", inline=inline)

    @action(detail=False, methods=["post"], url_path="desde-cotizacion/(?P<cotizacion_id>[^/.]+)")
    def desde_cotizacion(self, request, cotizacion_id=None):
        cot = Cotizacion.objects.filter(
            pk=cotizacion_id,
            empresa=request.empresa,
        ).first()
        if not cot:
            return Response({"detail": "Cotización no encontrada."}, status=status.HTTP_404_NOT_FOUND)
        try:
            factura = factura_desde_cotizacion(cot)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            FacturaSerializer(factura, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )
