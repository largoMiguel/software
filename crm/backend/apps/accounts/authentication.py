from __future__ import annotations

import logging

from django.conf import settings
from django.contrib.auth import get_user_model
from clerk_backend_api.security.types import AuthenticateRequestOptions
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

from apps.accounts.clerk_client import get_clerk_client
from apps.accounts.services.clerk import ClerkServiceError, get_primary_email_for_clerk_id
from apps.accounts.tenancy import apply_request_empresa_context

logger = logging.getLogger(__name__)
User = get_user_model()


class ClerkAuthentication(BaseAuthentication):
    def authenticate(self, request):
        secret = settings.CLERK_SECRET_KEY
        if not secret:
            return None

        django_request = getattr(request, "_request", request)
        options = AuthenticateRequestOptions(
            secret_key=secret,
            authorized_parties=settings.CLERK_AUTHORIZED_PARTIES or None,
            jwt_key=settings.CLERK_JWT_KEY or None,
        )
        sdk = get_clerk_client()
        if sdk is None:
            return None
        state = sdk.authenticate_request(django_request, options)
        if not state.is_signed_in:
            return None

        payload = state.payload or {}
        clerk_id = payload.get("sub")
        if not clerk_id:
            raise AuthenticationFailed("Token Clerk sin identificador de usuario.")

        user = self._resolve_user(clerk_id)
        if not user.is_active:
            raise AuthenticationFailed("Tu cuenta está inhabilitada.")
        apply_request_empresa_context(request, user)
        return (user, payload)

    def _resolve_user(self, clerk_id: str) -> User:
        user = User.objects.filter(clerk_id=clerk_id).first()
        if user:
            return user

        try:
            email = get_primary_email_for_clerk_id(clerk_id)
        except ClerkServiceError as exc:
            logger.warning("Clerk lookup failed for %s: %s", clerk_id, exc)
            raise AuthenticationFailed("No se pudo verificar el usuario en Clerk.") from exc

        if not email:
            raise AuthenticationFailed("Usuario de Clerk sin email.")

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise AuthenticationFailed(
                "Tu cuenta no está registrada en SoftOne CRM. Contacta al administrador.",
                code="user_not_provisioned",
            )

        user.clerk_id = clerk_id
        user.save(update_fields=["clerk_id"])
        return user
