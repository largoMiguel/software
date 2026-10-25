import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/core/auth/store";
import DashboardPage from "@/features/auth/DashboardPage";

/** Inicio del CRM: plataforma con empresa activa va solo a configuración. */
export default function TenantHomeRoute() {
  const user = useAuthStore((s) => s.user);
  if (user?.is_platform_admin) {
    return <Navigate to="/app/empresa" replace />;
  }
  return <DashboardPage />;
}
