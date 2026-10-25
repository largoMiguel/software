from __future__ import annotations

import uuid

from django.contrib.auth import get_user_model
from django.db.models import F, Sum
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.tenancy import require_empresa
from apps.empresas.membership_policy import (
    assert_keeps_at_least_one_admin,
    assert_user_may_be_team_member,
    team_membresias_for_empresa,
)
from apps.empresas.models import Empresa, Membresia
from apps.common.b2_client import upload_public_object
from apps.cotizaciones.models import Cotizacion
from apps.empresas.permissions import HasActiveEmpresa, IsEmpresaAdmin, IsPlatformAdmin, IsTenantOperator
from apps.facturas.models import Factura
from apps.empresas.purge import purge_empresa
from apps.empresas.serializers import (
    EmpresaSerializer,
    InvitarMiembroSerializer,
    MembresiaSerializer,
    PlatformEmpresaCreateSerializer,
)

User = get_user_model()


class PlatformEmpresaViewSet(viewsets.ModelViewSet):
    """CRUD de empresas — solo administrador de plataforma SoftOne."""

    queryset = Empresa.objects.all().order_by("nombre")
    serializer_class = EmpresaSerializer
    permission_classes = [IsAuthenticated, IsPlatformAdmin]
    search_fields = ("nombre", "nit", "slug")
    filterset_fields = ("is_active",)

    def get_serializer_class(self):
        if self.action == "create":
            return PlatformEmpresaCreateSerializer
        return EmpresaSerializer

    def perform_destroy(self, instance):
        purge_empresa(instance)


class EmpresaConfigView(APIView):
    permission_classes = [IsAuthenticated, HasActiveEmpresa, IsEmpresaAdmin]

    def get(self, request):
        empresa = require_empresa(request)
        return Response(EmpresaSerializer(empresa).data)

    def patch(self, request):
        empresa = require_empresa(request)
        serializer = EmpresaSerializer(empresa, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class EmpresaLogoUploadView(APIView):
    permission_classes = [IsAuthenticated, HasActiveEmpresa, IsEmpresaAdmin]
    parser_classes = [MultiPartParser, FormParser]

    MAX_BYTES = 2 * 1024 * 1024
    ALLOWED = {"image/png", "image/jpeg", "image/webp"}

    def post(self, request):
        empresa = require_empresa(request)
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Archivo requerido (file)."}, status=status.HTTP_400_BAD_REQUEST)
        if upload.size > self.MAX_BYTES:
            return Response({"detail": "Máximo 2 MB."}, status=status.HTTP_400_BAD_REQUEST)
        content_type = upload.content_type or "application/octet-stream"
        if content_type not in self.ALLOWED:
            return Response({"detail": "Formato no permitido."}, status=status.HTTP_400_BAD_REQUEST)

        ext = {"image/png": "png", "image/jpeg": "jpg", "image/webp": "webp"}[content_type]
        key = f"empresas/{empresa.id}/logo-{uuid.uuid4().hex[:12]}.{ext}"
        try:
            url = upload_public_object(key, upload.read(), content_type)
        except RuntimeError:
            return Response(
                {"detail": "Almacenamiento B2 no configurado. Usa logo_url en configuración."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        empresa.logo_url = url
        empresa.save(update_fields=["logo_url", "updated_at"])
        return Response(EmpresaSerializer(empresa).data)


class TenantResumenView(APIView):
    permission_classes = [IsAuthenticated, HasActiveEmpresa, IsTenantOperator]

    def get(self, request):
        empresa = require_empresa(request)
        hoy = timezone.now().date()
        mes_inicio = hoy.replace(day=1)

        cot_abiertas = Cotizacion.objects.filter(
            empresa=empresa,
            estado__in=(Cotizacion.EST_BORRADOR, Cotizacion.EST_ENVIADA),
        ).count()

        facturas_base = Factura.objects.filter(empresa=empresa).exclude(
            estado__in=(Factura.EST_BORRADOR, Factura.EST_ANULADA)
        )
        por_cobrar_qs = facturas_base.filter(total__gt=F("total_pagado"))
        por_cobrar_count = por_cobrar_qs.count()
        por_cobrar_total = por_cobrar_qs.aggregate(s=Sum(F("total") - F("total_pagado")))["s"] or 0

        vencidas_count = por_cobrar_qs.filter(fecha_vencimiento__lt=hoy).count()

        ventas_mes = facturas_base.filter(fecha_emision__gte=mes_inicio).aggregate(s=Sum("total"))["s"] or 0

        return Response(
            {
                "cotizaciones_abiertas": cot_abiertas,
                "facturas_por_cobrar": por_cobrar_count,
                "saldo_por_cobrar": str(por_cobrar_total),
                "facturas_vencidas": vencidas_count,
                "ventas_mes": str(ventas_mes),
            }
        )


class MembresiaViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    mixins.DestroyModelMixin,
    viewsets.GenericViewSet,
):
    serializer_class = MembresiaSerializer
    permission_classes = [IsAuthenticated, HasActiveEmpresa, IsEmpresaAdmin]

    def get_queryset(self):
        empresa = require_empresa(self.request)
        return team_membresias_for_empresa(empresa).order_by("-created_at")

    def get_serializer_class(self):
        if self.action == "create":
            return InvitarMiembroSerializer
        return MembresiaSerializer

    def create(self, request, *args, **kwargs):
        serializer = InvitarMiembroSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        membresia = serializer.save()
        return Response(MembresiaSerializer(membresia).data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        assert_user_may_be_team_member(instance.user)
        if instance.rol in Membresia.ADMIN_ROLES:
            assert_keeps_at_least_one_admin(instance.empresa, exclude_membresia_id=instance.pk)
        instance.delete()

    @action(detail=True, methods=["patch"], url_path="rol")
    def cambiar_rol(self, request, pk=None):
        membresia = self.get_object()
        assert_user_may_be_team_member(membresia.user)
        rol = request.data.get("rol")
        if rol not in dict(Membresia.ROL_CHOICES):
            return Response({"detail": "Rol inválido."}, status=status.HTTP_400_BAD_REQUEST)
        if membresia.rol in Membresia.ADMIN_ROLES and rol not in Membresia.ADMIN_ROLES:
            assert_keeps_at_least_one_admin(membresia.empresa, exclude_membresia_id=membresia.pk)
        membresia.rol = rol
        membresia.save(update_fields=["rol"])
        return Response(MembresiaSerializer(membresia).data)
