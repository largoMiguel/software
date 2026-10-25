from __future__ import annotations

from rest_framework.permissions import BasePermission

from apps.accounts.tenancy import require_empresa


class IsPlatformAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_platform_admin)


class HasActiveEmpresa(BasePermission):
    message = "Selecciona una empresa activa."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        try:
            require_empresa(request)
        except Exception:
            return False
        return True


class IsTenantOperator(BasePermission):
    """Operación comercial del tenant — no administradores de plataforma SoftOne."""

    message = "Los administradores de plataforma solo pueden configurar la empresa."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_platform_admin:
            return False
        try:
            require_empresa(request)
        except Exception:
            return False
        return True


class IsEmpresaAdmin(BasePermission):
    message = "Se requiere rol administrador de la empresa."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        membresia = getattr(request, "membresia", None)
        if membresia and membresia.rol in membresia.ADMIN_ROLES:
            return True
        if request.user.is_platform_admin and getattr(request, "empresa", None):
            return True
        return False
