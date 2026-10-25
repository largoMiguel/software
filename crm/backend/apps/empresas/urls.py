from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.empresas.views import (
    EmpresaConfigView,
    EmpresaLogoUploadView,
    MembresiaViewSet,
    PlatformEmpresaViewSet,
    TenantResumenView,
)

router = DefaultRouter()
router.register(r"platform/empresas", PlatformEmpresaViewSet, basename="platform-empresa")
router.register(r"membresias", MembresiaViewSet, basename="membresia")

urlpatterns = [
    path("empresa/config/", EmpresaConfigView.as_view(), name="empresa-config"),
    path("empresa/config/logo/", EmpresaLogoUploadView.as_view(), name="empresa-logo"),
    path("reportes/resumen/", TenantResumenView.as_view(), name="reportes-resumen"),
    path("", include(router.urls)),
]
