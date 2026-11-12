import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import {
  correspondenciaApi,
  type CorrespondenciaDetail,
  type CorrespondenciaListItem,
} from "@/core/api/correspondencia";
import { formatApiError } from "@/core/api/errors";
import { primaryRole, useAuthStore } from "@/core/auth/store";
import CorrespondenciaFormModal from "./CorrespondenciaFormModal";

function slaBadge(status: CorrespondenciaListItem["sla_status"]) {
  const map = {
    en_plazo: "bg-emerald-50 text-emerald-700",
    por_vencer: "bg-amber-50 text-amber-700",
    vencida: "bg-red-50 text-red-700",
    cerrado: "bg-slate-100 text-slate-600",
  } as const;
  const labels = {
    en_plazo: "En plazo",
    por_vencer: "Por vencer",
    vencida: "Vencida",
    cerrado: "Cerrado",
  } as const;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status]}`}>
      {labels[status]}
    </span>
  );
}

export default function CorrespondenciaListPage({
  sentido,
}: {
  sentido?: "entrada" | "salida";
}) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isAdmin = primaryRole(user) === "admin";
  const [items, setItems] = useState<CorrespondenciaListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<CorrespondenciaDetail | null>(null);
  const [editLoadingId, setEditLoadingId] = useState<number | null>(null);

  async function openEdit(id: number) {
    setEditLoadingId(id);
    try {
      setEditItem(await correspondenciaApi.get(id));
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setEditLoadingId(null);
    }
  }

  async function handleDelete(id: number, numero: string) {
    if (
      !window.confirm(
        `¿Eliminar el radicado ${numero}?\n\nSe borrarán también los anexos. Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    try {
      await correspondenciaApi.remove(id);
      await load();
    } catch (err) {
      setError(formatApiError(err));
    }
  }

  async function load() {
    setLoading(true);
    try {
      const params: Record<string, string> = { page_size: "50" };
      if (sentido) params.sentido = sentido;
      if (search.trim()) params.search = search.trim();
      if (estado) params.estado = estado;
      const res = await correspondenciaApi.list(params);
      setItems(res.results);
      setError(null);
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search, estado, sentido]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar radicado, asunto, remitente…"
            className="w-full rounded-[0.3rem] border border-slate-300 py-2 pl-10 pr-3 text-sm"
          />
        </div>
        <select
          value={estado}
          onChange={(e) => setEstado(e.target.value)}
          className="rounded-[0.3rem] border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="radicada">Radicada</option>
          <option value="en_tramite">En trámite</option>
          <option value="respondida">Respondida</option>
          <option value="cerrada">Cerrada</option>
          <option value="archivada">Archivada</option>
        </select>
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-[0.3rem] bg-[#3eafd4] px-4 py-2 text-sm font-medium text-white hover:bg-[#2d9bbf]"
        >
          <Plus className="h-4 w-4" /> Radicar
        </button>
      </div>

      {error && (
        <div className="rounded-[0.3rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="divide-y divide-slate-100 md:hidden">
          {loading && <div className="px-4 py-8 text-center text-slate-500">Cargando…</div>}
          {!loading && items.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">Sin radicados.</div>
          )}
          {items.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => navigate(`/correspondencia/${r.id}`)}
              className="block w-full space-y-2 p-4 text-left hover:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-mono text-xs text-[#0e7490]">{r.numero_radicado}</div>
                {slaBadge(r.sla_status)}
              </div>
              <div className="font-medium text-slate-800">{r.asunto}</div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                {!sentido && <span className="capitalize">{r.sentido}</span>}
                <span>{new Date(r.fecha_radicacion).toLocaleDateString("es-CO")}</span>
                <span>{r.secretaria_nombre}</span>
                <span>{r.estado_label}</span>
              </div>
              {isAdmin && (
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    disabled={editLoadingId === r.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void openEdit(r.id);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#0e7490]"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(r.id, r.numero_radicado);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Eliminar
                  </button>
                </div>
              )}
            </button>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="whitespace-nowrap px-4 py-3">Radicado</th>
              {!sentido && <th className="whitespace-nowrap px-4 py-3">Sentido</th>}
              <th className="whitespace-nowrap px-4 py-3">Fecha</th>
              <th className="whitespace-nowrap px-4 py-3">Asunto</th>
              <th className="whitespace-nowrap px-4 py-3">Secretaría</th>
              <th className="whitespace-nowrap px-4 py-3">Estado</th>
              <th className="whitespace-nowrap px-4 py-3">SLA</th>
              {isAdmin && <th className="whitespace-nowrap px-4 py-3">Acciones</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                  Cargando…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={isAdmin ? 8 : 7} className="px-4 py-8 text-center text-slate-500">
                  Sin radicados.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r.id}
                  className="cursor-pointer hover:bg-slate-50/80"
                  onClick={() => navigate(`/correspondencia/${r.id}`)}
                >
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[#0e7490]">
                    <Link
                      to={`/correspondencia/${r.id}`}
                      className="hover:underline focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {r.numero_radicado}
                    </Link>
                  </td>
                  {!sentido && (
                    <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-600">
                      {r.sentido}
                    </td>
                  )}
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">
                    {new Date(r.fecha_radicacion).toLocaleDateString("es-CO")}
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-800">{r.asunto}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                    {r.secretaria_nombre}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-700">{r.estado_label}</td>
                  <td className="whitespace-nowrap px-4 py-3">{slaBadge(r.sla_status)}</td>
                  {isAdmin && (
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Editar"
                          disabled={editLoadingId === r.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            void openEdit(r.id);
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-[#0e7490]"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          title="Eliminar"
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(r.id, r.numero_radicado);
                          }}
                          className="rounded p-1 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>

      {showForm && (
        <CorrespondenciaFormModal
          defaultSentido={sentido || "entrada"}
          onClose={() => setShowForm(false)}
          onCreated={(id) => {
            setShowForm(false);
            navigate(`/correspondencia/${id}`);
          }}
        />
      )}

      {editItem && (
        <CorrespondenciaFormModal
          defaultSentido={editItem.sentido}
          edit={editItem}
          onClose={() => setEditItem(null)}
          onSaved={() => {
            setEditItem(null);
            void load();
          }}
        />
      )}
    </div>
  );
}
