from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.accounts.services.clerk import ClerkServiceError, invite_user_to_clerk
from apps.empresas.membership_policy import assert_user_email_may_be_invited, assert_user_may_be_team_member
from apps.empresas.models import Empresa, Membresia

User = get_user_model()


class PlatformEmpresaCreateSerializer(serializers.ModelSerializer):
    """Alta de tenant: el admin del cliente queda como propietario (no el usuario de plataforma)."""

    admin_email = serializers.EmailField(write_only=True)
    admin_full_name = serializers.CharField(
        max_length=150, required=False, allow_blank=True, write_only=True, default=""
    )

    class Meta:
        model = Empresa
        fields = ("nombre", "nit", "admin_email", "admin_full_name")

    def validate_admin_email(self, value: str) -> str:
        email = value.strip().lower()
        assert_user_email_may_be_invited(email)
        return email

    def create(self, validated_data):
        admin_email = validated_data.pop("admin_email")
        admin_name = (validated_data.pop("admin_full_name", "") or "").strip()
        empresa = Empresa.objects.create(**validated_data)
        user, created = User.objects.get_or_create(
            email=admin_email,
            defaults={"full_name": admin_name, "is_active": True},
        )
        assert_user_may_be_team_member(user)
        if admin_name and not user.full_name:
            user.full_name = admin_name
            user.save(update_fields=["full_name"])
        Membresia.objects.create(user=user, empresa=empresa, rol=Membresia.ROL_OWNER)
        try:
            invite_user_to_clerk(admin_email, admin_name)
        except ClerkServiceError:
            pass
        return empresa


class EmpresaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Empresa
        fields = (
            "id",
            "nombre",
            "slug",
            "nit",
            "direccion",
            "telefono",
            "email",
            "logo_url",
            "prefijo_cotizacion",
            "prefijo_factura",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "slug", "created_at", "updated_at")


class MembresiaSerializer(serializers.ModelSerializer):
    user_email = serializers.EmailField(source="user.email", read_only=True)
    user_name = serializers.CharField(source="user.full_name", read_only=True)

    class Meta:
        model = Membresia
        fields = ("id", "user_id", "user_email", "user_name", "empresa_id", "rol", "created_at")
        read_only_fields = ("id", "empresa_id", "created_at")


class InvitarMiembroSerializer(serializers.Serializer):
    email = serializers.EmailField()
    full_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    rol = serializers.ChoiceField(choices=Membresia.ROL_CHOICES, default=Membresia.ROL_VENDEDOR)

    def validate_email(self, value):
        email = value.strip().lower()
        assert_user_email_may_be_invited(email)
        return email

    def create(self, validated_data):
        request = self.context["request"]
        empresa = request.empresa
        email = validated_data["email"]
        full_name = validated_data.get("full_name", "")
        rol = validated_data["rol"]

        user, _ = User.objects.get_or_create(
            email=email,
            defaults={"full_name": full_name, "is_active": True},
        )
        assert_user_may_be_team_member(user)
        if full_name and not user.full_name:
            user.full_name = full_name
            user.save(update_fields=["full_name"])

        membresia, created = Membresia.objects.get_or_create(
            user=user,
            empresa=empresa,
            defaults={"rol": rol},
        )
        if not created:
            membresia.rol = rol
            membresia.save(update_fields=["rol"])

        try:
            invite_user_to_clerk(email, full_name)
        except ClerkServiceError:
            pass

        return membresia
