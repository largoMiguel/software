from __future__ import annotations

from apps.accounts.tenancy import require_empresa


class TenantViewSetMixin:
    empresa_field = "empresa"

    def get_queryset(self):
        qs = super().get_queryset()
        empresa = require_empresa(self.request)
        return qs.filter(**{self.empresa_field: empresa})

    def perform_create(self, serializer):
        empresa = require_empresa(self.request)
        serializer.save(**{self.empresa_field: empresa})
