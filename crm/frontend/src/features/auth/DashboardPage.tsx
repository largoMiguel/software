import { useQuery } from "@tanstack/react-query";
import { FileText, Package, Receipt, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { SoftOneCard, SoftOneLoading } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { useAuthStore } from "@/core/auth/store";
import { activeMembership, ROL_LABELS } from "@/core/navigation/crmNav";

type Resumen = {
  cotizaciones_abiertas: number;
  facturas_por_cobrar: number;
  saldo_por_cobrar: string;
  facturas_vencidas: number;
  ventas_mes: string;
};

const modules = [
  { to: "/app/clientes", title: "Clientes", desc: "Directorio de clientes", icon: Users },
  { to: "/app/productos", title: "Catálogo", desc: "Productos y servicios", icon: Package },
  { to: "/app/cotizaciones", title: "Cotizaciones", desc: "Propuestas comerciales", icon: FileText },
  { to: "/app/facturas", title: "Facturas", desc: "Facturación interna", icon: Receipt },
];

function money(v: string) {
  return `$${Number(v).toLocaleString("es-CO")}`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const activeEmpresaId = useAuthStore((s) => s.activeEmpresaId);
  const membership = activeMembership(user, activeEmpresaId);

  const { data: resumen, isLoading } = useQuery({
    queryKey: ["reportes-resumen"],
    queryFn: async () => {
      const { data } = await api.get<Resumen>("/reportes/resumen/");
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#3eafd4]/10 text-[#3eafd4]">
          <Receipt className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111827] sm:text-2xl">
            Hola{user?.full_name ? `, ${user.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
            {membership
              ? `${membership.empresa_nombre} · ${ROL_LABELS[membership.rol] ?? membership.rol}`
              : "Panel del CRM"}
          </p>
        </div>
      </div>

      {isLoading ? (
        <SoftOneLoading label="Cargando indicadores…" />
      ) : resumen ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SoftOneCard title="Cotizaciones abiertas">
            <p className="text-2xl font-bold text-[#0e7490]">{resumen.cotizaciones_abiertas}</p>
            <Link to="/app/cotizaciones" className="mt-2 inline-block text-sm text-[#0e7490] hover:underline">
              Ver cotizaciones
            </Link>
          </SoftOneCard>
          <SoftOneCard title="Por cobrar">
            <p className="text-2xl font-bold text-[#0e7490]">{resumen.facturas_por_cobrar}</p>
            <p className="text-sm text-slate-600">Saldo: {money(resumen.saldo_por_cobrar)}</p>
          </SoftOneCard>
          <SoftOneCard title="Facturas vencidas">
            <p className="text-2xl font-bold text-red-600">{resumen.facturas_vencidas}</p>
            <Link to="/app/facturas" className="mt-2 inline-block text-sm text-[#0e7490] hover:underline">
              Ver facturas
            </Link>
          </SoftOneCard>
          <SoftOneCard title="Ventas del mes">
            <p className="text-2xl font-bold text-slate-800">{money(resumen.ventas_mes)}</p>
          </SoftOneCard>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.to}
              to={card.to}
              className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#3eafd4] hover:shadow-md"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-[#3eafd4]/10 text-[#3eafd4]">
                <Icon className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-slate-800 group-hover:text-[#0e7490]">{card.title}</h2>
              <p className="mt-1 text-sm text-slate-500">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
