from django.conf import settings
from django.contrib import admin
from django.http import JsonResponse
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView


def healthcheck(_request):
    return JsonResponse({"status": "ok"})


urlpatterns = [
    path("api/health", healthcheck),
    path("api/v1/", include("config.api_v1")),
]

if getattr(settings, "ENABLE_DJANGO_ADMIN", settings.DEBUG):
    urlpatterns.insert(0, path("admin/", admin.site.urls))

if settings.DEBUG or getattr(settings, "ALLOW_API_DOCS", False):
    urlpatterns += [
        path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
        path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger"),
    ]
