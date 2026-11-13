"""Tests de cálculo de avance por evidencias."""
from decimal import Decimal
from unittest import TestCase

from rest_framework.exceptions import ValidationError

from apps.planes.evidencia_sync import (
    compute_avance_pct,
    ejecutado_restante,
    parse_meta_programada,
    total_ejecutado,
    validate_cantidad_ejecutada,
)


class MockEvidencia:
    def __init__(self, cantidad, url_evidencia=""):
        self.cantidad_ejecutada = Decimal(str(cantidad))
        self.url_evidencia = url_evidencia
        self.archivos = []


class MockActividad:
    def __init__(self, meta="", evidencias=None):
        self.meta = meta
        self.evidencias = evidencias or []

    class EvidenciasManager:
        def __init__(self, items):
            self._items = items

        def all(self):
            return self._items

    def __init__(self, meta="", evidencias=None):
        self.meta = meta
        self.evidencias = self.EvidenciasManager(evidencias or [])


class EvidenciaSyncTests(TestCase):
    def test_parse_meta_programada(self):
        self.assertEqual(parse_meta_programada("30"), Decimal("30"))
        self.assertEqual(parse_meta_programada("30 unidades"), Decimal("30"))

    def test_avance_10_de_30(self):
        act = MockActividad(meta="30", evidencias=[MockEvidencia(10)])
        self.assertEqual(compute_avance_pct(act), 33)

    def test_avance_suma_evidencias(self):
        act = MockActividad(
            meta="30",
            evidencias=[MockEvidencia(10), MockEvidencia(5)],
        )
        self.assertEqual(total_ejecutado(act), Decimal("15"))
        self.assertEqual(compute_avance_pct(act), 50)

    def test_avance_meta_1_ejecutado_1(self):
        act = MockActividad(meta="1", evidencias=[MockEvidencia(1)])
        self.assertEqual(compute_avance_pct(act), 100)

    def test_avance_meta_6_ejecutado_3(self):
        act = MockActividad(meta="6", evidencias=[MockEvidencia(3)])
        self.assertEqual(compute_avance_pct(act), 50)

    def test_ejecutado_restante_mock(self):
        act = MockActividad(meta="10", evidencias=[MockEvidencia(5)])
        self.assertEqual(ejecutado_restante(act), 5)

    def test_validate_cantidad_excede_meta(self):
        act = MockActividad(meta="10", evidencias=[MockEvidencia(8)])
        with self.assertRaises(ValidationError):
            validate_cantidad_ejecutada(act, 5)

    def test_avance_evidencia_sin_meta_numerica(self):
        act = MockActividad(
            meta="Cumplimiento trimestral",
            evidencias=[MockEvidencia(0, url_evidencia="https://example.com/ev")],
        )
        self.assertEqual(compute_avance_pct(act), 100)

    def test_avance_meta_baja_con_ejecucion_y_soporte(self):
        act = MockActividad(
            meta="4",
            evidencias=[MockEvidencia(1, url_evidencia="https://example.com/ev")],
        )
        self.assertEqual(compute_avance_pct(act), 100)

    def test_avance_meta_numerica_solo_documento(self):
        act = MockActividad(
            meta="1",
            evidencias=[MockEvidencia(0, url_evidencia="https://example.com/ev")],
        )
        self.assertEqual(compute_avance_pct(act), 100)
