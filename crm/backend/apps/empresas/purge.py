from __future__ import annotations

from django.db import transaction

from apps.empresas.models import Empresa


@transaction.atomic
def purge_empresa(empresa: Empresa) -> None:
    """
    Elimina una empresa y todo su tenant (facturas, cotizaciones, clientes, catálogo, membresías).
    Orden explícito por FKs PROTECT entre factura/cotización y cliente.
    """
    from apps.catalogo.models import Categoria, Producto
    from apps.clientes.models import Cliente
    from apps.cotizaciones.models import Cotizacion
    from apps.facturas.models import Factura

    Factura.objects.filter(empresa=empresa).delete()
    Cotizacion.objects.filter(empresa=empresa).delete()
    Cliente.objects.filter(empresa=empresa).delete()
    Producto.objects.filter(empresa=empresa).delete()
    Categoria.objects.filter(empresa=empresa).delete()
    empresa.membresias.all().delete()
    empresa.consecutivos.all().delete()
    empresa.delete()
