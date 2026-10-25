from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.empresas.models import Empresa, Membresia
from apps.empresas.views import MembresiaViewSet

User = get_user_model()


class MembresiaPermissionTests(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Perm Co", slug="perm-co")
        self.admin = User.objects.create_user(email="admin@perm.test")
        self.vendedor = User.objects.create_user(email="vendedor@perm.test")
        Membresia.objects.create(user=self.admin, empresa=self.empresa, rol=Membresia.ROL_ADMIN)
        Membresia.objects.create(user=self.vendedor, empresa=self.empresa, rol=Membresia.ROL_VENDEDOR)
        self.factory = APIRequestFactory()

    def _list_as(self, user):
        request = self.factory.get("/api/v1/membresias/")
        force_authenticate(request, user=user)
        request.empresa = self.empresa
        request.membresia = Membresia.objects.get(user=user, empresa=self.empresa)
        view = MembresiaViewSet.as_view({"get": "list"})
        return view(request)

    def test_vendedor_cannot_list_membresias(self):
        response = self._list_as(self.vendedor)
        self.assertEqual(response.status_code, 403)

    def test_admin_can_list_membresias(self):
        response = self._list_as(self.admin)
        self.assertEqual(response.status_code, 200)
