import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { formatApiError } from "@/core/api/pagination";
import { useAuthStore } from "@/core/auth/store";

type Empresa = {
  id: number;
  nombre: string;
  nit: string;
  slug: string;
  is_active: boolean;
  prefijo_cotizacion?: string;
  prefijo_factura?: string;
};

export default function PlatformEmpresasPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const setActiveEmpresaId = useAuthStore((s) => s.setActiveEmpresaId);
  const [search, setSearch] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editEmpresa, setEditEmpresa] = useState<Empresa | null>(null);
  const [deleteEmpresa, setDeleteEmpresa] = useState<Empresa | null>(null);

  useEffect(() => {
    setActiveEmpresaId(null);
  }, [setActiveEmpresaId]);

  const { data, isLoading } = useQuery({
    queryKey: ["platform-empresas"],
    queryFn: async () => {
      const { data: res } = await api.get<{ results: Empresa[] }>("/platform/empresas/");
      return res.results ?? res;
    },
  });

  const list = Array.isArray(data) ? data : [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        e.slug.toLowerCase().includes(q) ||
        (e.nit && e.nit.toLowerCase().includes(q)),
    );
  }, [list, search]);

  function openEmpresa(empresa: Empresa) {
    setActiveEmpresaId(empresa.id);
    navigate("/app/empresa");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-[#111827] sm:text-2xl">
            <Building2 className="h-6 w-6 text-[#3eafd4]" />
            Empresas cliente
          </h1>
          <p className="mt-1 text-xs text-slate-600 sm:text-sm">
            Crea tenants del CRM. Cada cliente tiene su admin, catálogo y facturación aislados.
          </p>
        </div>
        <button type="button" onClick={() => setShowNew(true)} className={btnPrimary}>
          <Plus className="h-4 w-4" />
          Nueva empresa
        </button>
      </div>

      <div className="rounded-[0.6rem] border border-[#e9ecef] bg-white p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, slug o NIT…"
            className={`${inputClass} pl-10`}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center text-slate-500">
          Cargando…
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <Building2 className="mx-auto mb-2 h-10 w-10 text-slate-300" />
          No hay empresas.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((e) => (
            <div
              key={e.id}
              className="group flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 transition-all hover:border-[#3eafd4] hover:shadow-md"
            >
              <button
                type="button"
                onClick={() => openEmpresa(e)}
                className="flex flex-col gap-2 text-left"
                title="Configuración de esta empresa (plataforma)"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-800 group-hover:text-[#0e7490]">{e.nombre}</h3>
                    <p className="text-xs text-slate-500">Slug: {e.slug}</p>
                    {e.nit && <p className="text-xs text-slate-500">NIT: {e.nit}</p>}
                  </div>
                  <ChevronRight className="h-5 w-5 flex-shrink-0 text-slate-400 group-hover:text-[#3eafd4]" />
                </div>
                <p className="text-[0.7rem] text-slate-500">Clic para configuración (datos, miembros)</p>
                <div className="flex items-center gap-1.5 text-xs">
                  {e.is_active ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Activa</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="h-3.5 w-3.5 text-slate-400" />
                      <span className="text-slate-500">Inactiva</span>
                    </>
                  )}
                </div>
              </button>
              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  className={btnSecondary + " !px-2 !py-1 text-xs"}
                  onClick={() => setEditEmpresa(e)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </button>
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded-[0.3rem] border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  onClick={() => setDeleteEmpresa(e)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewEmpresaModal
          onClose={() => setShowNew(false)}
          onCreated={() => {
            setShowNew(false);
            qc.invalidateQueries({ queryKey: ["platform-empresas"] });
          }}
        />
      )}

      {editEmpresa && (
        <EditEmpresaModal
          empresa={editEmpresa}
          onClose={() => setEditEmpresa(null)}
          onSaved={() => {
            setEditEmpresa(null);
            qc.invalidateQueries({ queryKey: ["platform-empresas"] });
          }}
        />
      )}

      <DeleteEmpresaDialog
        empresa={deleteEmpresa}
        onClose={() => setDeleteEmpresa(null)}
        onDeleted={() => {
          setDeleteEmpresa(null);
          qc.invalidateQueries({ queryKey: ["platform-empresas"] });
        }}
      />
    </div>
  );
}

function EditEmpresaModal({
  empresa,
  onClose,
  onSaved,
}: {
  empresa: Empresa;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [nombre, setNombre] = useState(empresa.nombre);
  const [nit, setNit] = useState(empresa.nit ?? "");
  const [isActive, setIsActive] = useState(empresa.is_active);
  const [prefijoCot, setPrefijoCot] = useState(empresa.prefijo_cotizacion ?? "COT");
  const [prefijoFac, setPrefijoFac] = useState(empresa.prefijo_factura ?? "FV");
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () =>
      api.patch(`/platform/empresas/${empresa.id}/`, {
        nombre,
        nit,
        is_active: isActive,
        prefijo_cotizacion: prefijoCot,
        prefijo_factura: prefijoFac,
      }),
    onSuccess: onSaved,
    onError: (err) => setError(formatApiError(err)),
  });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            save.mutate();
          }}
          className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-lg font-semibold text-slate-900">Editar empresa</h2>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          <div className="mt-4 space-y-3">
            <label className="block text-sm font-medium text-slate-700">
              Nombre
              <input className={`${inputClass} mt-1`} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              NIT
              <input className={`${inputClass} mt-1`} value={nit} onChange={(e) => setNit(e.target.value)} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm font-medium text-slate-700">
                Prefijo cotización
                <input className={`${inputClass} mt-1`} value={prefijoCot} onChange={(e) => setPrefijoCot(e.target.value)} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Prefijo factura
                <input className={`${inputClass} mt-1`} value={prefijoFac} onChange={(e) => setPrefijoFac(e.target.value)} />
              </label>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Empresa activa
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={save.isPending}>
              {save.isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

function DeleteEmpresaDialog({
  empresa,
  onClose,
  onDeleted,
}: {
  empresa: Empresa | null;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/platform/empresas/${id}/`),
    onSuccess: onDeleted,
  });

  return (
    <ConfirmDeleteDialog
      open={!!empresa}
      title="Eliminar empresa y todos sus datos"
      description={
        empresa
          ? `Se borrarán clientes, productos, cotizaciones, facturas, categorías y membresías de «${empresa.nombre}». Esta acción no se puede deshacer.`
          : ""
      }
      confirmMatch={empresa?.nombre}
      onClose={onClose}
      onConfirm={() => empresa && remove.mutate(empresa.id)}
      isPending={remove.isPending}
    />
  );
}

function NewEmpresaModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [nombre, setNombre] = useState("");
  const [nit, setNit] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/platform/empresas/", {
        nombre,
        nit,
        admin_email: adminEmail,
        admin_full_name: adminName,
      });
    },
    onSuccess: onCreated,
    onError: () => setError("No se pudo crear la empresa. Revisa los datos."),
  });

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setError(null);
            setSaving(true);
            create.mutate(undefined, { onSettled: () => setSaving(false) });
          }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-[#1c2536] px-6 py-3 text-white">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <h2 className="text-base font-semibold">Nueva empresa cliente</h2>
            </div>
            <button type="button" onClick={onClose} className="text-white/80 hover:text-white">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4 px-6 py-5">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <label className="block text-sm font-medium text-slate-700">
              Nombre *
              <input
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              NIT
              <input value={nit} onChange={(e) => setNit(e.target.value)} className={`${inputClass} mt-1`} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Email admin del cliente *
              <input
                required
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                className={`${inputClass} mt-1`}
                placeholder="admin@empresa.com"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Nombre del admin
              <input
                value={adminName}
                onChange={(e) => setAdminName(e.target.value)}
                className={`${inputClass} mt-1`}
              />
            </label>
            <p className="text-xs text-slate-500">
              Esa persona será propietaria de la empresa y recibirá invitación en Clerk. Tú no quedas como miembro.
            </p>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
            <button type="button" onClick={onClose} className="rounded-[0.3rem] px-4 py-2 text-sm text-slate-600">
              Cancelar
            </button>
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? "Guardando…" : "Crear empresa"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
