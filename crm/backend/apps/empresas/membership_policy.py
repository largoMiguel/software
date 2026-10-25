from __future__ import annotations

from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

from apps.empresas.models import Membresia

User = get_user_model()

PLATFORM_MEMBER_MSG = (
    "Las cuentas de administración de plataforma SoftOne no pueden ser miembros de una empresa cliente."
)
LAST_ADMIN_MSG = "Debe quedar al menos un propietario o administrador en la empresa."


def team_membresias_for_empresa(empresa):
    """Miembros del equipo del tenant — excluye cuentas de plataforma."""
    return Membresia.objects.select_related("user").filter(empresa=empresa).exclude(user__is_platform_admin=True)


def assert_user_may_be_team_member(user) -> None:
    if user.is_platform_admin:
        raise ValidationError({"detail": PLATFORM_MEMBER_MSG})


def assert_user_email_may_be_invited(email: str) -> None:
    user = User.objects.filter(email=email).first()
    if user:
        assert_user_may_be_team_member(user)


def admin_count(empresa, *, exclude_membresia_id: int | None = None) -> int:
    qs = team_membresias_for_empresa(empresa).filter(rol__in=Membresia.ADMIN_ROLES)
    if exclude_membresia_id is not None:
        qs = qs.exclude(pk=exclude_membresia_id)
    return qs.count()


def assert_keeps_at_least_one_admin(empresa, *, exclude_membresia_id: int | None = None) -> None:
    if admin_count(empresa, exclude_membresia_id=exclude_membresia_id) < 1:
        raise ValidationError({"detail": LAST_ADMIN_MSG})
