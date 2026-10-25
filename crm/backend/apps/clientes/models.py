from __future__ import annotations

from django.db import models

from apps.empresas.models import TenantModel


class Cliente(TenantModel):
    TIPO_NIT = "nit"
    TIPO_CC = "cc"
    TIPO_CE = "ce"
    TIPO_DOC_CHOICES = (
        (TIPO_NIT, "NIT"),
        (TIPO_CC, "Cédula"),
        (TIPO_CE, "Cédula extranjería"),
    )

    tipo_documento = models.CharField(max_length=10, choices=TIPO_DOC_CHOICES, default=TIPO_NIT)
    documento = models.CharField(max_length=50, db_index=True)
    categoria = models.ForeignKey(
        "catalogo.Categoria",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="clientes",
    )
    razon_social = models.CharField(max_length=200)
    contacto_nombre = models.CharField(max_length=150, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    telefono = models.CharField(max_length=50, blank=True, default="")
    direccion = models.CharField(max_length=300, blank=True, default="")
    notas = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_clientes"
        unique_together = (("empresa", "tipo_documento", "documento"),)
        ordering = ["razon_social"]

    def __str__(self) -> str:
        return self.razon_social
