from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.accounts.tenancy import require_empresa
from apps.catalogo.import_csv import import_productos_csv
from apps.catalogo.models import Categoria, Producto
from apps.catalogo.serializers import ProductoSerializer
from apps.catalogo.serializers_categoria import CategoriaSerializer
from apps.empresas.mixins import TenantViewSetMixin
from apps.empresas.permissions import IsTenantOperator


class CategoriaViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = CategoriaSerializer
    permission_classes = [IsAuthenticated, IsTenantOperator]
    queryset = Categoria.objects.all()
    search_fields = ("nombre",)
    filterset_fields = ("tipo",)
    ordering_fields = ("nombre", "created_at")


class ProductoViewSet(TenantViewSetMixin, viewsets.ModelViewSet):
    serializer_class = ProductoSerializer
    permission_classes = [IsAuthenticated, IsTenantOperator]
    queryset = Producto.objects.select_related("categoria")
    search_fields = ("nombre", "codigo", "descripcion")
    filterset_fields = ("is_active", "tipo", "categoria")
    ordering_fields = ("nombre", "precio", "created_at")

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx["request"] = self.request
        return ctx

    @action(
        detail=False,
        methods=["post"],
        url_path="import-csv",
        parser_classes=[MultiPartParser, FormParser],
    )
    def import_csv(self, request):
        upload = request.FILES.get("file")
        if not upload:
            return Response({"detail": "Envía el archivo en el campo 'file'."}, status=status.HTTP_400_BAD_REQUEST)
        if not upload.name.lower().endswith(".csv"):
            return Response({"detail": "Solo archivos .csv"}, status=status.HTTP_400_BAD_REQUEST)
        empresa = require_empresa(request)
        update_existing = request.data.get("update_existing", "true") not in ("false", "0", False)
        result = import_productos_csv(empresa, upload, update_existing=update_existing)
        return Response(result)
