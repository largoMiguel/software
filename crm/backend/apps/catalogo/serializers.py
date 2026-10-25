from rest_framework import serializers

from apps.accounts.tenancy import require_empresa
from apps.catalogo.categorias import resolve_categoria
from apps.catalogo.models import Categoria, Producto


class ProductoSerializer(serializers.ModelSerializer):
    categoria_id = serializers.PrimaryKeyRelatedField(
        source="categoria",
        queryset=Categoria.objects.all(),
        required=False,
        allow_null=True,
    )
    categoria_nombre = serializers.CharField(required=False, allow_blank=True, write_only=True)
    categoria_nombre_display = serializers.CharField(source="categoria.nombre", read_only=True, default="")

    class Meta:
        model = Producto
        fields = (
            "id",
            "categoria_id",
            "categoria_nombre",
            "categoria_nombre_display",
            "codigo",
            "nombre",
            "descripcion",
            "tipo",
            "precio",
            "precio_incluye_iva",
            "iva_porcentaje",
            "is_active",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get("request")
        if request:
            try:
                empresa = require_empresa(request)
                self.fields["categoria_id"].queryset = Categoria.objects.filter(
                    empresa=empresa, tipo=Categoria.TIPO_PRODUCTO
                )
            except Exception:
                pass

    def _apply_categoria(self, validated_data):
        request = self.context["request"]
        empresa = require_empresa(request)
        cat_nombre = validated_data.pop("categoria_nombre", None)
        if cat_nombre is not None and str(cat_nombre).strip():
            validated_data["categoria"] = resolve_categoria(
                empresa,
                tipo=Categoria.TIPO_PRODUCTO,
                categoria_nombre=cat_nombre,
            )
        categoria = validated_data.get("categoria")
        if categoria and categoria.empresa_id != empresa.pk:
            raise serializers.ValidationError({"categoria_id": "Categoría de otra empresa."})
        if categoria and categoria.tipo != Categoria.TIPO_PRODUCTO:
            raise serializers.ValidationError({"categoria_id": "Categoría no válida para productos."})
        return validated_data

    def create(self, validated_data):
        validated_data = self._apply_categoria(validated_data)
        return super().create(validated_data)

    def update(self, instance, validated_data):
        validated_data = self._apply_categoria(validated_data)
        return super().update(instance, validated_data)
