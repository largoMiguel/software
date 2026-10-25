import { useLocation } from "react-router-dom";
import { Building2 } from "lucide-react";
import { useAuthStore } from "@/core/auth/store";
import { isPlatformRoute } from "@/core/navigation/crmNav";

export default function CrmContextBanner() {
  const user = useAuthStore((s) => s.user);
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

  return null;
}
