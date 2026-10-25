from __future__ import annotations

from django.conf import settings
from django.db import models
from django.utils.text import slugify


class Empresa(models.Model):
    nombre = models.CharField(max_length=200)
    slug = models.SlugField(max_length=120, unique=True)
    nit = models.CharField(max_length=50, blank=True, default="")
    direccion = models.CharField(max_length=300, blank=True, default="")
    telefono = models.CharField(max_length=50, blank=True, default="")
    email = models.EmailField(blank=True, default="")
    logo_url = models.URLField(max_length=500, blank=True, default="")
    prefijo_cotizacion = models.CharField(max_length=20, default="COT")
    prefijo_factura = models.CharField(max_length=20, default="FV")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "crm_empresas"
        ordering = ["nombre"]

    def __str__(self) -> str:
        return self.nombre

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(self.nombre)[:100] or "empresa"
            slug = base
            n = 1
            while Empresa.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                n += 1
                slug = f"{base}-{n}"
            self.slug = slug
        super().save(*args, **kwargs)


class Membresia(models.Model):
    ROL_OWNER = "owner"
    ROL_ADMIN = "admin"
    ROL_VENDEDOR = "vendedor"
    ROL_CHOICES = (
        (ROL_OWNER, "Propietario"),
        (ROL_ADMIN, "Administrador"),
        (ROL_VENDEDOR, "Vendedor"),
    )
    ADMIN_ROLES = {ROL_OWNER, ROL_ADMIN}

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="membresias",
    )
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="membresias")
    rol = models.CharField(max_length=20, choices=ROL_CHOICES, default=ROL_VENDEDOR)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "crm_membresias"
        unique_together = (("user", "empresa"),)

    def __str__(self) -> str:
        return f"{self.user.email} @ {self.empresa.nombre} ({self.rol})"


class Consecutivo(models.Model):
    TIPO_COTIZACION = "cotizacion"
    TIPO_FACTURA = "factura"
    TIPO_CHOICES = (
        (TIPO_COTIZACION, "Cotización"),
        (TIPO_FACTURA, "Factura"),
    )

    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, related_name="consecutivos")
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES)
    anio = models.PositiveSmallIntegerField()
    ultimo = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "crm_consecutivos"
        unique_together = (("empresa", "tipo", "anio"),)


class TenantModel(models.Model):
    empresa = models.ForeignKey(Empresa, on_delete=models.CASCADE, db_index=True)

    class Meta:
        abstract = True
