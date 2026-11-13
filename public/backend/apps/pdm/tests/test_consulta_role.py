"""Permisos del rol consulta_pdm en el módulo PDM."""
from __future__ import annotations

from django.contrib.auth.models import Group
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.accounts.models import User, UserEntityMembership
from apps.entities.models import Entity


class ConsultaPdmRoleTests(TestCase):
    def setUp(self) -> None:
        self.entity = Entity.objects.create(
            name="Entidad Test",
            slug="entidad-test-consulta",
            enable_pdm=True,
            enable_pqrs=True,
        )
        self.consulta = User.objects.create_user(
            email="consulta@example.com",
            password="unused",
            full_name="Consulta PDM",
        )
        Group.objects.get_or_create(name="consulta_pdm")
        UserEntityMembership.objects.create(
            user=self.consulta,
            entity=self.entity,
            role="consulta_pdm",
            is_active=True,
            enabled_modules=["pdm"],
        )
        self.consulta.entity = self.entity
        self.consulta._active_role = "consulta_pdm"
        self.consulta.enabled_modules = ["pdm"]
        self.client = APIClient()
        self.client.force_authenticate(user=self.consulta)
        self.client.credentials(HTTP_X_ENTITY_ID=str(self.entity.id))

    def test_pdm_meta_read_ok(self) -> None:
        response = self.client.get(f"/api/v1/pdm/v2/{self.entity.slug}/meta")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pdm_upload_forbidden(self) -> None:
        response = self.client.post(f"/api/v1/pdm/v2/{self.entity.slug}/upload")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pqrs_list_forbidden(self) -> None:
        response = self.client.get("/api/v1/pqrs/")
        self.assertIn(response.status_code, (status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND))

    def test_user_has_module_only_pdm(self) -> None:
        from apps.common.modules import user_has_module

        self.assertTrue(user_has_module(self.consulta, "pdm"))
        self.assertFalse(user_has_module(self.consulta, "pqrs"))

