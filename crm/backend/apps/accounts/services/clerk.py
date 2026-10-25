from __future__ import annotations

import logging

from clerk_backend_api.models import ClerkErrors

from apps.accounts.clerk_client import get_clerk_client

logger = logging.getLogger(__name__)


class ClerkServiceError(Exception):
    pass


def _primary_email(clerk_user) -> str | None:
    addresses = clerk_user.email_addresses or []
    primary_id = getattr(clerk_user, "primary_email_address_id", None)
    for addr in addresses:
        if primary_id and getattr(addr, "id", None) == primary_id:
            return getattr(addr, "email_address", None)
    if addresses:
        return getattr(addresses[0], "email_address", None)
    return None


def get_primary_email_for_clerk_id(clerk_id: str) -> str | None:
    sdk = get_clerk_client()
    if sdk is None:
        raise ClerkServiceError("Clerk no configurado")
    try:
        user = sdk.users.get(user_id=clerk_id)
    except ClerkErrors as exc:
        raise ClerkServiceError(str(exc)) from exc
    return _primary_email(user)


def invite_user_to_clerk(email: str, full_name: str = "") -> str | None:
    """Crea invitación Clerk; devuelve clerk user id si ya existe."""
    sdk = get_clerk_client()
    if sdk is None:
        raise ClerkServiceError("Clerk no configurado")
    from django.conf import settings

    redirect = f"{settings.APP_PUBLIC_URL.rstrip('/')}/sign-up"
    parts = (full_name or "").strip().split(None, 1)
    first = parts[0] if parts else ""
    last = parts[1] if len(parts) > 1 else ""
    try:
        sdk.invitations.create(
            request={
                "email_address": email,
                "redirect_url": redirect,
                "public_metadata": {"full_name": full_name},
            }
        )
        return None
    except ClerkErrors as exc:
        raw = str(exc).lower()
        if "already" in raw or "exists" in raw:
            users = sdk.users.list(request={"email_address": [email]})
            data = getattr(users, "data", None) or []
            if data:
                return getattr(data[0], "id", None)
        raise ClerkServiceError(str(exc)) from exc
