import { Navigate, Route, Routes } from "react-router-dom";
import CrmLayout from "@/components/layout/CrmLayout";
import {
  RequireAuth,
  RequireEmpresaLayout,
  RequirePlatformAdmin,
  RequireTenantOperatorLayout,
} from "@/core/auth/RequireAuth";
import LoginPage from "@/features/auth/LoginPage";
import SignUpPage from "@/features/auth/SignUpPage";
import SelectEmpresaPage from "@/features/auth/SelectEmpresaPage";
import TenantHomeRoute from "@/features/auth/TenantHomeRoute";
import ClientesPage from "@/features/clientes/ClientesPage";
import ProductosPage from "@/features/catalogo/ProductosPage";
import CotizacionesPage from "@/features/cotizaciones/CotizacionesPage";
import CotizacionDetallePage from "@/features/cotizaciones/CotizacionDetallePage";
import EditarCotizacionPage from "@/features/cotizaciones/EditarCotizacionPage";
import NuevaCotizacionPage from "@/features/cotizaciones/NuevaCotizacionPage";
import EditarFacturaPage from "@/features/facturas/EditarFacturaPage";
import FacturaDetallePage from "@/features/facturas/FacturaDetallePage";
import FacturasPage from "@/features/facturas/FacturasPage";
import NuevaFacturaPage from "@/features/facturas/NuevaFacturaPage";
import EmpresaConfigPage from "@/features/empresa/EmpresaConfigPage";
import PlatformEmpresasPage from "@/features/superadmin/PlatformEmpresasPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login/*" element={<LoginPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route
        path="/seleccionar-empresa"
        element={
          <RequireAuth>
            <SelectEmpresaPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app"
        element={
          <RequireAuth>
            <CrmLayout />
          </RequireAuth>
        }
      >
        <Route
          path="platform/empresas"
          element={
            <RequirePlatformAdmin>
              <PlatformEmpresasPage />
            </RequirePlatformAdmin>
          }
        />
        <Route element={<RequireEmpresaLayout />}>
          <Route index element={<TenantHomeRoute />} />
          <Route path="empresa" element={<EmpresaConfigPage />} />
          <Route element={<RequireTenantOperatorLayout />}>
            <Route path="clientes" element={<ClientesPage />} />
            <Route path="productos" element={<ProductosPage />} />
            <Route path="cotizaciones" element={<CotizacionesPage />} />
            <Route path="cotizaciones/nueva" element={<NuevaCotizacionPage />} />
            <Route path="cotizaciones/:id/editar" element={<EditarCotizacionPage />} />
            <Route path="cotizaciones/:id" element={<CotizacionDetallePage />} />
            <Route path="facturas" element={<FacturasPage />} />
            <Route path="facturas/nueva" element={<NuevaFacturaPage />} />
            <Route path="facturas/:id" element={<FacturaDetallePage />} />
            <Route path="facturas/:id/editar" element={<EditarFacturaPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
