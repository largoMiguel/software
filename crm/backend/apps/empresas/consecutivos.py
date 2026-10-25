from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.empresas.models import Consecutivo, Empresa


@transaction.atomic
def siguiente_numero(empresa: Empresa, tipo: str) -> str:
    anio = timezone.localdate().year
    row, _ = Consecutivo.objects.select_for_update().get_or_create(
        empresa=empresa,
        tipo=tipo,
        anio=anio,
        defaults={"ultimo": 0},
    )
    row.ultimo += 1
    row.save(update_fields=["ultimo"])

    if tipo == Consecutivo.TIPO_COTIZACION:
        prefijo = empresa.prefijo_cotizacion or "COT"
    else:
        prefijo = empresa.prefijo_factura or "FV"
    return f"{prefijo}-{anio}-{row.ultimo:04d}"
