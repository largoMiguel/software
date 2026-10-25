from rest_framework.routers import DefaultRouter

from apps.catalogo.views import CategoriaViewSet, ProductoViewSet

router = DefaultRouter()
router.register(r"categorias", CategoriaViewSet, basename="categoria")
router.register(r"productos", ProductoViewSet, basename="producto")

urlpatterns = router.urls
