from rest_framework.routers import DefaultRouter

from apps.facturas.views import FacturaViewSet

router = DefaultRouter()
router.register(r"facturas", FacturaViewSet, basename="factura")

urlpatterns = router.urls
