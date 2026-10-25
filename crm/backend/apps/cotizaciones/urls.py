from rest_framework.routers import DefaultRouter

from apps.cotizaciones.views import CotizacionViewSet

router = DefaultRouter()
router.register(r"cotizaciones", CotizacionViewSet, basename="cotizacion")

urlpatterns = router.urls
