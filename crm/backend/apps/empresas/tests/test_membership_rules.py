from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.empresas.membership_policy import assert_may_remove_member, transfer_propietario
from apps.empresas.models import Empresa, Membresia
from apps.empresas.views import MembresiaViewSet

User = get_user_model()


class MembershipRulesTests(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Rules Co", slug="rules-co")
        self.owner = User.objects.create_user(email="owner@rules.test")
        self.admin = User.objects.create_user(email="admin@rules.test")
        self.owner_m = Membresia.objects.create(
            user=self.owner, empresa=self.empresa, rol=Membresia.ROL_OWNER
        )
        self.admin_m = Membresia.objects.create(
            user=self.admin, empresa=self.empresa, rol=Membresia.ROL_ADMIN
        )
        self.factory = APIRequestFactory()

    def test_transfer_propietario_demotes_previous_owner(self):
        self.admin_m.rol = Membresia.ROL_OWNER
        self.admin_m.save(update_fields=["rol"])
        transfer_propietario(self.empresa, self.admin.id)
        self.admin_m.refresh_from_db()
        self.owner_m.refresh_from_db()
        self.assertEqual(self.admin_m.rol, Membresia.ROL_OWNER)
        self.assertEqual(self.owner_m.rol, Membresia.ROL_ADMIN)

    def test_cannot_remove_self_as_tenant_admin(self):
        request = self.factory.delete("/api/v1/membresias/1/")
        force_authenticate(request, user=self.owner)
        request.empresa = self.empresa
        request.membresia = self.owner_m
        with self.assertRaises(ValidationError):
            assert_may_remove_member(request, self.owner_m)

    def test_admin_can_remove_other_member(self):
        view = MembresiaViewSet.as_view({"delete": "destroy"})
        request = self.factory.delete(f"/api/v1/membresias/{self.admin_m.pk}/")
        force_authenticate(request, user=self.owner)
        request.empresa = self.empresa
        request.membresia = self.owner_m
        response = view(request, pk=self.admin_m.pk)
        self.assertEqual(response.status_code, 204)
