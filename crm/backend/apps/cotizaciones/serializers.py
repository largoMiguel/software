from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from apps.clientes.models import Cliente
from apps.catalogo.models import Producto
from apps.cotizaciones.models import Cotizacion, CotizacionItem
from apps.facturas.models import Factura
from apps.empresas.consecutivos import siguiente_numero
from apps.empresas.models import Consecutivo
from apps.cotizaciones.services import recalcular_cotizacion


class CotizacionItemSerializer(serializers.ModelSerializer):
    producto_id = serializers.PrimaryKeyRelatedField(
        source="producto",
        queryset=Producto.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = CotizacionItem
        fields = (
            "id",
            "producto_id",
            "descripcion",
            "cantidad",
            "precio_unitario",
            "precio_incluye_iva",
            "descuento_porcentaje",
            "iva_porcentaje",
            "subtotal_linea",
            "iva_linea",
            "total_linea",
            "orden",
        )
        read_only_fields = ("subtotal_linea", "iva_linea", "total_linea")


class CotizacionSerializer(serializers.ModelSerializer):
    items = CotizacionItemSerializer(many=True)
    cliente_id = serializers.PrimaryKeyRelatedField(source="cliente", queryset=Cliente.objects.all())
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)
    factura_vigente_id = serializers.SerializerMethodField()
    factura_vigente_numero = serializers.SerializerMethodField()

    class Meta:
        model = Cotizacion
        fields = (
            "id",
            "numero",
            "cliente_id",
            "cliente_nombre",
            "factura_vigente_id",
            "factura_vigente_numero",
            "estado",
            "fecha_emision",
            "fecha_vencimiento",
            "notas",
            "subtotal",
            "iva_total",
            "total",
            "items",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "numero",
            "estado",
            "subtotal",
            "iva_total",
            "total",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "fecha_emision": {"required": False},
            "fecha_vencimiento": {"required": False},
            "notas": {"required": False},
        }

    def get_factura_vigente_id(self, obj: Cotizacion) -> int | None:
        factura = (
            obj.facturas.exclude(estado=Factura.EST_ANULADA).order_by("-created_at").first()
        )
        return factura.pk if factura else None

    def get_factura_vigente_numero(self, obj: Cotizacion) -> str | None:
        factura = (
            obj.facturas.exclude(estado=Factura.EST_ANULADA).order_by("-created_at").first()
        )
        return factura.numero if factura else None

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Agrega al menos una línea.")
        return items

    def validate_cliente_id(self, cliente):
        request = self.context["request"]
        empresa = request.empresa
        if cliente.empresa_id != empresa.pk:
            raise serializers.ValidationError("Cliente de otra empresa.")
        return cliente

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data.setdefault("fecha_emision", timezone.localdate())
        empresa = validated_data["empresa"]
        validated_data["numero"] = siguiente_numero(empresa, Consecutivo.TIPO_COTIZACION)
        cotizacion = Cotizacion.objects.create(**validated_data)
        self._save_items(cotizacion, items_data)
        recalcular_cotizacion(cotizacion)
        return cotizacion

    def update(self, instance, validated_data):
        if instance.estado != Cotizacion.EST_BORRADOR:
            raise serializers.ValidationError("Solo se editan cotizaciones en borrador.")
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            self._save_items(instance, items_data)
        recalcular_cotizacion(instance)
        return instance

    def _save_items(self, cotizacion, items_data):
        request = self.context["request"]
        empresa = request.empresa
        for idx, item_data in enumerate(items_data):
            producto = item_data.get("producto")
            if producto and producto.empresa_id != empresa.pk:
                raise serializers.ValidationError("Producto de otra empresa.")
            if producto and not item_data.get("descripcion"):
                item_data["descripcion"] = producto.nombre
            if producto and "precio_incluye_iva" not in item_data:
                item_data["precio_incluye_iva"] = producto.precio_incluye_iva
            elif "precio_incluye_iva" not in item_data:
                item_data.setdefault("precio_incluye_iva", True)
            CotizacionItem.objects.create(cotizacion=cotizacion, orden=idx, **item_data)
