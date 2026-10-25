from django.urls import include, path

from apps.accounts.webhooks import ClerkWebhookView

urlpatterns = [
    path("auth/", include("apps.accounts.urls")),
    path("webhooks/clerk", ClerkWebhookView.as_view(), name="clerk-webhook"),
    path("", include("apps.empresas.urls")),
    path("", include("apps.clientes.urls")),
    path("", include("apps.catalogo.urls")),
    path("", include("apps.cotizaciones.urls")),
    path("", include("apps.facturas.urls")),
]
