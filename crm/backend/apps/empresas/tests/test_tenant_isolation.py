from decimal import Decimal

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.clientes.models import Cliente
from apps.empresas.models import Empresa, Membresia

User = get_user_model()


class TenantIsolationTests(TestCase):
    def setUp(self):
        self.empresa_a = Empresa.objects.create(nombre="Empresa A", slug="empresa-a")
        self.empresa_b = Empresa.objects.create(nombre="Empresa B", slug="empresa-b")
        self.user = User.objects.create_user(email="vendedor@test.com")
        Membresia.objects.create(user=self.user, empresa=self.empresa_a, rol=Membresia.ROL_VENDEDOR)
        Cliente.objects.create(
            empresa=self.empresa_a,
            tipo_documento=Cliente.TIPO_NIT,
            documento="9001",
            razon_social="Cliente A",
        )
        Cliente.objects.create(
            empresa=self.empresa_b,
            tipo_documento=Cliente.TIPO_NIT,
            documento="9002",
            razon_social="Cliente B",
        )

    def test_clientes_filtrados_por_empresa(self):
        qs_a = Cliente.objects.filter(empresa=self.empresa_a)
        qs_b = Cliente.objects.filter(empresa=self.empresa_b)
        self.assertEqual(qs_a.count(), 1)
        self.assertEqual(qs_b.count(), 1)
        self.assertNotEqual(qs_a.first().razon_social, qs_b.first().razon_social)
