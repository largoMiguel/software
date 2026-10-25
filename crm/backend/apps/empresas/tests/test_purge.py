from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.catalogo.models import Categoria, Producto
from apps.clientes.models import Cliente
from apps.cotizaciones.models import Cotizacion
from apps.empresas.models import Empresa, Membresia
from apps.empresas.purge import purge_empresa
from apps.facturas.models import Factura

User = get_user_model()


class PurgeEmpresaTests(TestCase):
    def setUp(self):
        self.empresa = Empresa.objects.create(nombre="Purge Co", slug="purge-co")
        self.user = User.objects.create_user(email="owner@purge.test")
        Membresia.objects.create(user=self.user, empresa=self.empresa, rol=Membresia.ROL_OWNER)
        cat = Categoria.objects.create(empresa=self.empresa, nombre="Cat", tipo=Categoria.TIPO_PRODUCTO)
        Producto.objects.create(empresa=self.empresa, nombre="P", precio=100, categoria=cat)
        self.cliente = Cliente.objects.create(
            empresa=self.empresa,
            tipo_documento=Cliente.TIPO_NIT,
            documento="123",
            razon_social="Cliente",
        )
        Cotizacion.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            numero="COT-1",
            fecha_emision="2026-01-01",
        )
        Factura.objects.create(
            empresa=self.empresa,
            cliente=self.cliente,
            numero="FV-1",
            fecha_emision="2026-01-02",
        )

    def test_purge_removes_tenant_data(self):
        empresa_id = self.empresa.id
        purge_empresa(self.empresa)
        self.assertFalse(Empresa.objects.filter(pk=empresa_id).exists())
        self.assertEqual(Cliente.objects.filter(empresa_id=empresa_id).count(), 0)
        self.assertEqual(Cotizacion.objects.filter(empresa_id=empresa_id).count(), 0)
        self.assertEqual(Factura.objects.filter(empresa_id=empresa_id).count(), 0)
        self.assertEqual(Membresia.objects.filter(empresa_id=empresa_id).count(), 0)
