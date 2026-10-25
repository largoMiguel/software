from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.empresas.models import Membresia

User = get_user_model()


class MembresiaBriefSerializer(serializers.ModelSerializer):
    empresa_nombre = serializers.CharField(source="empresa.nombre", read_only=True)
    empresa_nit = serializers.CharField(source="empresa.nit", read_only=True)

    class Meta:
        model = Membresia
        fields = ("id", "empresa_id", "empresa_nombre", "empresa_nit", "rol", "created_at")


class MeSerializer(serializers.ModelSerializer):
    memberships = MembresiaBriefSerializer(source="membresias", many=True, read_only=True)
    active_empresa_id = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "full_name",
            "is_platform_admin",
            "memberships",
            "active_empresa_id",
        )

    def get_active_empresa_id(self, obj):
        request = self.context.get("request")
        empresa = getattr(request, "empresa", None)
        return empresa.pk if empresa else None
