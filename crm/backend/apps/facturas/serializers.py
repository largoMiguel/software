from __future__ import annotations

from django.utils import timezone
from rest_framework import serializers

from apps.clientes.models import Cliente
from apps.catalogo.models import Producto
from apps.facturas.models import Factura, FacturaItem, Pago
from apps.empresas.consecutivos import siguiente_numero
from apps.empresas.models import Consecutivo
from apps.facturas.services import recalcular_factura, registrar_pago


class PagoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pago
        fields = ("id", "fecha", "monto", "metodo", "referencia", "notas", "created_at")
        read_only_fields = ("id", "created_at")


class FacturaItemSerializer(serializers.ModelSerializer):
    producto_id = serializers.PrimaryKeyRelatedField(
        source="producto",
        queryset=Producto.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = FacturaItem
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


class FacturaSerializer(serializers.ModelSerializer):
    items = FacturaItemSerializer(many=True)
    pagos = PagoSerializer(many=True, read_only=True)
    cliente_id = serializers.PrimaryKeyRelatedField(source="cliente", queryset=Cliente.objects.all())
    cliente_nombre = serializers.CharField(source="cliente.razon_social", read_only=True)
    saldo_pendiente = serializers.SerializerMethodField()
    cotizacion_id = serializers.PrimaryKeyRelatedField(read_only=True, source="cotizacion")

    class Meta:
        model = Factura
        fields = (
            "id",
            "numero",
            "cliente_id",
            "cliente_nombre",
            "cotizacion_id",
            "estado",
            "fecha_emision",
            "fecha_vencimiento",
            "notas",
            "subtotal",
            "iva_total",
            "total",
            "total_pagado",
            "saldo_pendiente",
            "items",
            "pagos",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "numero",
            "estado",
            "subtotal",
            "iva_total",
            "total",
            "total_pagado",
            "created_at",
            "updated_at",
        )
        extra_kwargs = {
            "fecha_emision": {"required": False},
            "fecha_vencimiento": {"required": False},
            "notas": {"required": False},
        }

    def validate_items(self, items):
        if not items:
            raise serializers.ValidationError("Agrega al menos una línea.")
        return items

    def get_saldo_pendiente(self, obj):
        return obj.saldo_pendiente

    def validate_cliente_id(self, cliente):
        request = self.context["request"]
        if cliente.empresa_id != request.empresa.pk:
            raise serializers.ValidationError("Cliente de otra empresa.")
        return cliente

    def create(self, validated_data):
        items_data = validated_data.pop("items", [])
        validated_data.setdefault("fecha_emision", timezone.localdate())
        empresa = validated_data["empresa"]
        validated_data["numero"] = siguiente_numero(empresa, Consecutivo.TIPO_FACTURA)
        factura = Factura.objects.create(**validated_data)
        self._save_items(factura, items_data)
        recalcular_factura(factura)
        return factura

    def update(self, instance, validated_data):
        if instance.estado != Factura.EST_BORRADOR:
            raise serializers.ValidationError("Solo se editan facturas en borrador.")
        items_data = validated_data.pop("items", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            self._save_items(instance, items_data)
        recalcular_factura(instance)
        return instance

    def _save_items(self, factura, items_data):
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
            FacturaItem.objects.create(factura=factura, orden=idx, **item_data)


class RegistrarPagoSerializer(serializers.Serializer):
    fecha = serializers.DateField()
    monto = serializers.DecimalField(max_digits=14, decimal_places=2)
    metodo = serializers.CharField(max_length=50, required=False, allow_blank=True)
    referencia = serializers.CharField(max_length=100, required=False, allow_blank=True)
    notas = serializers.CharField(required=False, allow_blank=True)

    def create(self, validated_data):
        factura = self.context["factura"]
        if factura.estado == Factura.EST_ANULADA:
            raise serializers.ValidationError("Factura anulada.")
        if factura.estado == Factura.EST_BORRADOR:
            raise serializers.ValidationError("Emita la factura antes de registrar pagos.")
        return registrar_pago(factura, **validated_data)
