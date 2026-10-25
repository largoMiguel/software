from rest_framework import serializers

from apps.catalogo.models import Categoria


class CategoriaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nombre", "tipo", "created_at")
        read_only_fields = ("id", "created_at")

    def update(self, instance, validated_data):
        validated_data.pop("tipo", None)
        return super().update(instance, validated_data)
