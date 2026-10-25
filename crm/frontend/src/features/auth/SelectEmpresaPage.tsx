import { Building2, ChevronRight } from "lucide-react";
import { Navigate, useNavigate } from "react-router-dom";
import { btnLink } from "@/components/ui/SoftOneUi";
import { useAuthStore } from "@/core/auth/store";

export default function SelectEmpresaPage() {
  const user = useAuthStore((s) => s.user);
  const setActiveEmpresaId = useAuthStore((s) => s.setActiveEmpresaId);
  const navigate = useNavigate();

  if (!user) return null;

  if (user.is_platform_admin && user.memberships.length === 0) {
    return <Navigate to="/app/platform/empresas" replace />;
  }

  const options = user.memberships;

  return (
    <div className="mx-auto max-w-lg py-8 sm:py-12">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#3eafd4]/10 text-[#3eafd4]">
          <Building2 className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Selecciona empresa</h1>
          <p className="text-sm text-slate-500">Elige con cuál empresa trabajarás en esta sesión.</p>
        </div>
      </div>
      <ul className="space-y-2">
        {options.map((m) => (
          <li key={m.id}>
            <button
              type="button"
              className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left shadow-sm transition hover:border-[#3eafd4] hover:shadow-md"
              onClick={() => {
                setActiveEmpresaId(m.empresa_id);
                navigate(user.is_platform_admin ? "/app/empresa" : "/app");
              }}
            >
              <span>
                <span className="font-medium text-slate-800 group-hover:text-[#0e7490]">{m.empresa_nombre}</span>
                {m.empresa_nit && <span className="ml-2 text-xs text-slate-400">NIT {m.empresa_nit}</span>}
              </span>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-[#3eafd4]" />
            </button>
          </li>
        ))}
      </ul>
      {user.is_platform_admin && (
        <button type="button" className={`${btnLink} mt-6`} onClick={() => navigate("/app/platform/empresas")}>
          Volver a empresas (plataforma)
        </button>
      )}
    </div>
  );
}
