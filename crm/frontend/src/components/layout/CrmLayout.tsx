import { Menu } from "lucide-react";
import { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import CrmContextBanner from "@/components/layout/CrmContextBanner";
import CrmSidebar from "@/components/layout/CrmSidebar";
import { useAuthStore } from "@/core/auth/store";
import { activeMembership, isPlatformRoute } from "@/core/navigation/crmNav";

export default function CrmLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const location = useLocation();
  const membership = activeMembership(user, activeEmpresaId);
  const platformMode = isPlatformRoute(location.pathname);

  const mobileTitle = platformMode
    ? "Plataforma SoftOne"
    : membership?.empresa_nombre ?? "SoftOne CRM";

  return (
    <div className="flex h-screen min-h-0 overflow-x-clip overflow-y-hidden">
      <CrmSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col md:ml-16">
        <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate text-sm font-semibold text-slate-800">{mobileTitle}</span>
        </header>

        <main className="min-h-0 min-w-0 flex-1 overflow-x-clip overflow-y-auto bg-[#f0f2f5] pt-14 md:pt-0">
          <div className="p-4 sm:p-6">
            <CrmContextBanner />
            <Outlet />
          </div>
        </main>
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Cerrar menú"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
    </div>
  );
}
