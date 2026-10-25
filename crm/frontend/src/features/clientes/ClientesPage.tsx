import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { useState } from "react";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  SoftOneAlert,
  SoftOneEmpty,
  SoftOneField,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOnePagination,
  SoftOneSearchBar,
  SoftOneTable,
  SoftOneTableHead,
  SoftOneToolbar,
} from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { formatApiError, paginatedParams, type Paginated } from "@/core/api/pagination";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { SoftOneRowActions } from "@/components/ui/SoftOneRowActions";
import { CategoriasClientePanel } from "@/features/clientes/CategoriasClientePanel";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useListPageSize } from "@/core/hooks/useListPageSize";
import {
  categoryToPayload,
  CreatableCategorySelect,
  type CategoryValue,
} from "@/components/ui/CreatableCategorySelect";

type Cliente = {
  id: number;
  razon_social: string;
  documento: string;
  tipo_documento: string;
  email: string;
  telefono: string;
  is_active: boolean;
  categoria_id?: number | null;
  categoria_nombre_display?: string;
};

export default function ClientesPage() {
  const qc = useQueryClient();
  const { pageSize, setPageSize, pageSizeOptions } = useListPageSize(25);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebouncedValue(search, 300);
  const [form, setForm] = useState({ razon_social: "", documento: "", email: "", telefono: "" });
  const [categoria, setCategoria] = useState<CategoryValue>({ kind: "none" });
  const [categoriaFilter, setCategoriaFilter] = useState<CategoryValue>({ kind: "none" });
  const categoriaFilterId = categoriaFilter.kind === "id" ? categoriaFilter.id : undefined;
  const [editCliente, setEditCliente] = useState<Cliente | null>(null);
  const [deleteCliente, setDeleteCliente] = useState<Cliente | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["clientes", debouncedSearch, page, pageSize, categoriaFilterId],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<Cliente>>("/clientes/", {
        params: paginatedParams({
          search: debouncedSearch,
          page,
          pageSize,
          extra: categoriaFilterId ? { categoria: categoriaFilterId } : undefined,
        }),
      });
      return res;
    },
  });

  const updateCliente = useMutation({
    mutationFn: async (c: Cliente & { categoria: CategoryValue }) => {
      await api.patch(`/clientes/${c.id}/`, {
        razon_social: c.razon_social,
        documento: c.documento,
        tipo_documento: c.tipo_documento,
        email: c.email,
        telefono: c.telefono,
        is_active: c.is_active,
        ...categoryToPayload(c.categoria),
      });
    },
    onSuccess: () => {
      setEditCliente(null);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
    onError: (err) => setEditError(formatApiError(err)),
  });

  const removeCliente = useMutation({
    mutationFn: (id: number) => api.delete(`/clientes/${id}/`),
    onSuccess: () => {
      setDeleteCliente(null);
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/clientes/", {
        razon_social: form.razon_social,
        documento: form.documento,
        tipo_documento: "nit",
        email: form.email,
        telefono: form.telefono,
        ...categoryToPayload(categoria),
      });
    },
    onSuccess: () => {
      setForm({ razon_social: "", documento: "", email: "", telefono: "" });
      setCategoria({ kind: "none" });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const list = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title="Clientes"
        subtitle="CRUD, segmentos y búsqueda"
        icon={Users}
      />

      <CategoriasClientePanel />

      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <input
          className={inputClass}
          placeholder="Razón social"
          value={form.razon_social}
          onChange={(e) => setForm({ ...form, razon_social: e.target.value })}
          required
        />
        <input
          className={inputClass}
          placeholder="NIT / documento"
          value={form.documento}
          onChange={(e) => setForm({ ...form, documento: e.target.value })}
          required
        />
        <input
          className={inputClass}
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className={inputClass}
          placeholder="Teléfono"
          value={form.telefono}
          onChange={(e) => setForm({ ...form, telefono: e.target.value })}
        />
        <CreatableCategorySelect
          label="Segmento / categoría"
          tipo="cliente"
          value={categoria}
          onChange={setCategoria}
        />
        <button type="submit" className={btnPrimary} disabled={create.isPending}>
          Agregar cliente
        </button>
      </form>

      <SoftOneToolbar>
        <SoftOneSearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar clientes…"
        />
        <div className="w-full sm:min-w-[200px] sm:max-w-xs">
          <CreatableCategorySelect
            tipo="cliente"
            value={categoriaFilter}
            onChange={(v) => {
              setCategoriaFilter(v.kind === "new" ? { kind: "none" } : v);
              setPage(1);
            }}
            placeholder="Filtrar categoría…"
          />
        </div>
      </SoftOneToolbar>

      {isLoading ? (
        <SoftOneLoading />
      ) : list.length === 0 ? (
        <SoftOneEmpty message="No hay clientes que coincidan." />
      ) : (
        <>
          <SoftOneTable>
            <SoftOneTableHead>
              <th className="px-4 py-3">Razón social</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Documento</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Teléfono</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </SoftOneTableHead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.razon_social}</td>
                  <td className="px-4 py-3 text-slate-600">{c.categoria_nombre_display || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.documento}</td>
                  <td className="px-4 py-3 text-slate-600">{c.email || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{c.telefono || "—"}</td>
                  <td className="px-4 py-3">
                    <SoftOneRowActions
                      onEdit={() => {
                        setEditError(null);
                        setEditCliente(c);
                      }}
                      onDelete={() => setDeleteCliente(c)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </SoftOneTable>
          <SoftOnePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={(n) => {
              setPageSize(n as typeof pageSize);
              setPage(1);
            }}
          />
        </>
      )}

      {editCliente && (
        <ClienteEditModal
          cliente={editCliente}
          error={editError}
          onClose={() => setEditCliente(null)}
          onSave={(payload) => updateCliente.mutate(payload)}
          isPending={updateCliente.isPending}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteCliente}
        title="Eliminar cliente"
        description={
          deleteCliente
            ? `¿Eliminar «${deleteCliente.razon_social}»? Fallará si tiene cotizaciones o facturas.`
            : ""
        }
        onClose={() => setDeleteCliente(null)}
        onConfirm={() => deleteCliente && removeCliente.mutate(deleteCliente.id)}
        isPending={removeCliente.isPending}
      />
    </div>
  );
}

function ClienteEditModal({
  cliente,
  error,
  onClose,
  onSave,
  isPending,
}: {
  cliente: Cliente;
  error: string | null;
  onClose: () => void;
  onSave: (c: Cliente & { categoria: CategoryValue }) => void;
  isPending: boolean;
}) {
  const [razon, setRazon] = useState(cliente.razon_social);
  const [documento, setDocumento] = useState(cliente.documento);
  const [email, setEmail] = useState(cliente.email ?? "");
  const [telefono, setTelefono] = useState(cliente.telefono ?? "");
  const [categoria, setCategoria] = useState<CategoryValue>(
    cliente.categoria_id
      ? { kind: "id", id: cliente.categoria_id, label: cliente.categoria_nombre_display ?? "" }
      : { kind: "none" },
  );
  const [isActive, setIsActive] = useState(cliente.is_active !== false);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...cliente,
              razon_social: razon,
              documento,
              email,
              telefono,
              categoria,
              is_active: isActive,
            });
          }}
        >
          <h3 className="text-lg font-semibold">Editar cliente</h3>
          {error && (
            <div className="mt-2">
              <SoftOneAlert>{error}</SoftOneAlert>
            </div>
          )}
          <div className="mt-4 space-y-3">
            <SoftOneField label="Razón social">
              <input className={inputClass} value={razon} onChange={(e) => setRazon(e.target.value)} required />
            </SoftOneField>
            <SoftOneField label="Documento">
              <input className={inputClass} value={documento} onChange={(e) => setDocumento(e.target.value)} required />
            </SoftOneField>
            <SoftOneField label="Email">
              <input className={inputClass} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </SoftOneField>
            <SoftOneField label="Teléfono">
              <input className={inputClass} value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </SoftOneField>
            <CreatableCategorySelect tipo="cliente" value={categoria} onChange={setCategoria} label="Segmento" />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Cliente activo
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
