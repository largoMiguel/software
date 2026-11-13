"""Estadísticas y cronograma — Planes Institucionales."""
from __future__ import annotations

from collections import defaultdict
from datetime import date

from django.db.models import Count, Q
from django.utils import timezone

from apps.entities.models import Entity

from .access import actividades_queryset_for_user, planes_queryset_for_user
from .evidencia_sync import compute_avance_pct
from .models import ActividadEstado, PlanActividad, PlanInstitucional, Trimestre


def _default_anio() -> int:
    return timezone.now().year


def average_avance_actividades(actividades) -> float:
    """Promedio de avance entre actividades reales (no divide por 4 trimestres vacíos)."""
    items = list(actividades)
    if not items:
        return 0.0
    return round(sum(compute_avance_pct(a) for a in items) / len(items), 1)


def build_por_trimestre_metrics(actividades) -> list[dict]:
    """Resumen por trimestre solo con actividades existentes en el alcance."""
    items = list(actividades)
    por_trimestre: list[dict] = []
    for tri in Trimestre.values:
        tri_items = [a for a in items if a.trimestre == tri]
        avance_promedio = average_avance_actividades(tri_items) if tri_items else 0.0
        por_trimestre.append(
            {
                "trimestre": tri,
                "trimestre_label": Trimestre(tri).label,
                "total": len(tri_items),
                "completadas": sum(1 for a in tri_items if compute_avance_pct(a) >= 100),
                "avance_promedio": avance_promedio,
            }
        )
    return por_trimestre


def compute_plan_stats(user, entity: Entity, *, anio: int | None = None) -> dict:
    anio = anio or _default_anio()
    planes_qs = planes_queryset_for_user(user, entity).filter(anio=anio)
    act_qs = actividades_queryset_for_user(user, entity).filter(anio=anio)

    por_estado_plan = dict(
        planes_qs.values("estado").annotate(c=Count("id")).values_list("estado", "c")
    )
    actividades = list(act_qs.prefetch_related("evidencias", "evidencias__archivos"))
    por_estado_act: dict[str, int] = {}
    for act in actividades:
        avance = compute_avance_pct(act)
        if avance >= 100:
            estado = ActividadEstado.COMPLETADA
        elif avance > 0:
            estado = ActividadEstado.EN_PROGRESO
        else:
            estado = ActividadEstado.PENDIENTE
        por_estado_act[estado] = por_estado_act.get(estado, 0) + 1

    por_trimestre = build_por_trimestre_metrics(actividades)

    hoy = timezone.localdate()
    vencidas = 0
    for act in actividades:
        if not act.fecha_fin or act.fecha_fin >= hoy:
            continue
        avance = compute_avance_pct(act)
        if avance < 100:
            vencidas += 1

    sin_responsable = planes_qs.filter(responsable_secretaria__isnull=True).count()

    return {
        "anio": anio,
        "planes_total": planes_qs.count(),
        "planes_por_estado": por_estado_plan,
        "actividades_total": len(actividades),
        "actividades_por_estado": por_estado_act,
        "por_trimestre": por_trimestre,
        "actividades_vencidas": vencidas,
        "planes_sin_responsable": sin_responsable,
        "avance_promedio": average_avance_actividades(actividades),
    }


def attach_plan_list_metrics(plans, user, entity: Entity, *, trimestre: int | None = None):
    """Adjunta conteos/avance a instancias de plan (lista paginada o queryset)."""
    if not plans:
        return plans

    if hasattr(plans, "values_list"):
        plan_ids = list(plans.values_list("id", flat=True))
        plan_iter = list(plans)
    else:
        plan_iter = list(plans)
        plan_ids = [p.id for p in plan_iter]

    if not plan_ids:
        return plans

    anio_por_plan = {p.id: p.anio for p in plan_iter}
    act_filter = Q(plan_id__in=plan_ids, anio__in=set(anio_por_plan.values()))
    if trimestre:
        act_filter &= Q(trimestre=trimestre)

    act_qs = (
        actividades_queryset_for_user(user, entity)
        .filter(act_filter)
        .prefetch_related("evidencias", "evidencias__archivos")
    )
    by_plan: dict[int, list] = defaultdict(list)
    for act in act_qs:
        if act.anio != anio_por_plan.get(act.plan_id):
            continue
        by_plan[act.plan_id].append(act)

    for plan in plan_iter:
        acts = by_plan.get(plan.id, [])
        plan.actividades_count = len(acts)
        plan.avance_promedio = average_avance_actividades(acts)
    return plans


def build_resumen_por_trimestre(plan: PlanInstitucional, actividades) -> list[dict]:
    vigencia = [a for a in actividades if a.anio == plan.anio and a.plan_id == plan.id]
    return build_por_trimestre_metrics(vigencia)


def build_cronograma(user, entity: Entity, *, anio: int | None = None) -> list[dict]:
    anio = anio or _default_anio()
    act_qs = (
        actividades_queryset_for_user(user, entity)
        .filter(anio=anio)
        .select_related("plan", "plan__catalogo")
        .prefetch_related("evidencias")
        .order_by("plan__catalogo__orden", "plan_id", "trimestre", "fecha_inicio", "id")
    )

    by_plan: dict[int, dict] = {}
    for act in act_qs:
        bucket = by_plan.setdefault(
            act.plan_id,
            {
                "plan_id": act.plan_id,
                "plan_nombre": act.plan.catalogo.nombre,
                "catalogo_codigo": act.plan.catalogo.codigo,
                "catalogo_nombre": act.plan.catalogo.nombre,
                "actividades": [],
            },
        )
        avance = compute_avance_pct(act)
        if avance >= 100:
            estado = ActividadEstado.COMPLETADA
        elif avance > 0:
            estado = ActividadEstado.EN_PROGRESO
        else:
            estado = ActividadEstado.PENDIENTE
        bucket["actividades"].append(
            {
                "id": act.id,
                "nombre": act.nombre,
                "trimestre": act.trimestre,
                "trimestre_label": Trimestre(act.trimestre).label if act.trimestre in Trimestre.values else str(act.trimestre),
                "fecha_inicio": act.fecha_inicio.isoformat() if act.fecha_inicio else None,
                "fecha_fin": act.fecha_fin.isoformat() if act.fecha_fin else None,
                "estado": estado,
                "avance": avance,
                "responsable_secretaria_nombre": act.responsable_secretaria.nombre if act.responsable_secretaria_id else None,
            }
        )

    return list(by_plan.values())
