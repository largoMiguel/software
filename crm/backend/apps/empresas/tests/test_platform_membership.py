from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory, force_authenticate

from apps.empresas.models import Empresa, Membresia
from apps.empresas.serializers import InvitarMiembroSerializer
from apps.empresas.views import MembresiaViewSet

User = get_user_model()


class PlatformAdminMembershipTests(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Cliente SA", slug="cliente-sa")
        self.platform = User.objects.create_user(
            email="platform@softone.test",
            is_platform_admin=True,
        )
        self.owner = User.objects.create_user(email="owner@cliente.test")
        Membresia.objects.create(user=self.owner, empresa=self.empresa, rol=Membresia.ROL_OWNER)
        # Membresía errónea previa (se limpia en migración; el queryset también la oculta).
        Membresia.objects.create(user=self.platform, empresa=self.empresa, rol=Membresia.ROL_OWNER)
        self.factory = APIRequestFactory()

    def _list_as(self, user):
        request = self.factory.get("/api/v1/membresias/")
        force_authenticate(request, user=user)
        request.empresa = self.empresa
        request.membresia = Membresia.objects.filter(user=user, empresa=self.empresa).first()
        view = MembresiaViewSet.as_view({"get": "list"})
        return view(request)

    def test_list_excludes_platform_admin_users(self):
        response = self._list_as(self.owner)
        self.assertEqual(response.status_code, 200)
        payload = response.data.get("results", response.data)
        emails = [row["user_email"] for row in payload]
        self.assertEqual(emails, ["owner@cliente.test"])

    def test_invite_platform_email_rejected(self):
        request = self.factory.post("/api/v1/membresias/")
        force_authenticate(request, user=self.owner)
        request.empresa = self.empresa
        serializer = InvitarMiembroSerializer(
            data={"email": self.platform.email, "rol": Membresia.ROL_VENDEDOR},
            context={"request": request},
        )
        with self.assertRaises(ValidationError):
            serializer.is_valid(raise_exception=True)
