import { Link, useLocation } from "react-router-dom";
import { Building2, Briefcase } from "lucide-react";
import { useAuthStore } from "@/core/auth/store";
import { isPlatformRoute } from "@/core/navigation/crmNav";

export default function CrmContextBanner() {
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const location = useLocation();
  const platformMode = isPlatformRoute(location.pathname);
  if (!user) return null;

  if (platformMode && user.is_platform_admin) {
    return (
      <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-[#3eafd4]/25 bg-[#1c2536] px-4 py-3 text-sm text-white">
        <Building2 className="h-4 w-4 text-[#3eafd4]" />
        <span>
          <strong>Plataforma SoftOne</strong> — das de alta empresas cliente. El administrador de cada
          empresa opera cotizaciones y facturas.
        </span>
      </div>
    );
  }

  if (user.is_platform_admin && activeEmpresaId) {
    return (
      <div className="mb-6 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#3eafd4]/30 bg-[#f0fbff] px-4 py-3 text-sm text-[#0e7490]">
        <span className="flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Modo configuración (plataforma) — datos y miembros, sin operación comercial
        </span>
        <Link to="/app/platform/empresas" className="font-medium underline hover:no-underline">
          Volver a plataforma
        </Link>
      </div>
    );
  }

  return null;
}
