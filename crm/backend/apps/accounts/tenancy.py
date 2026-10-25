from __future__ import annotations

from rest_framework.exceptions import AuthenticationFailed, PermissionDenied

from apps.empresas.models import Empresa, Membresia


def apply_request_empresa_context(request, user) -> None:
    """Resuelve request.empresa y request.membresia desde X-Empresa-Id."""
    request.empresa = None
    request.membresia = None

    raw = (request.headers.get("X-Empresa-Id") or "").strip()
    if not raw:
        return

    try:
        empresa_id = int(raw)
    except ValueError as exc:
        raise AuthenticationFailed("X-Empresa-Id inválido.") from exc

    if user.is_platform_admin:
        empresa = Empresa.objects.filter(pk=empresa_id, is_active=True).first()
        if not empresa:
            raise PermissionDenied("Empresa no encontrada o inactiva.")
        request.empresa = empresa
        request.membresia = Membresia.objects.filter(user=user, empresa=empresa).first()
        return

    membresia = (
        Membresia.objects.select_related("empresa")
        .filter(user=user, empresa_id=empresa_id, empresa__is_active=True)
        .first()
    )
    if not membresia:
        raise PermissionDenied("No tienes acceso a esta empresa.")
    request.empresa = membresia.empresa
    request.membresia = membresia


def require_empresa(request) -> Empresa:
    empresa = getattr(request, "empresa", None)
    if not empresa:
        raise PermissionDenied("Selecciona una empresa (cabecera X-Empresa-Id).")
    return empresa
