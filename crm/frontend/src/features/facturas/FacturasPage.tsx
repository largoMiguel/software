import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Receipt } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import {
  btnLink,
  btnPrimary,
  btnSecondary,
  selectClass,
  SoftOneEmpty,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOnePagination,
  SoftOneSearchBar,
  SoftOneTable,
  SoftOneTableHead,
  SoftOneToolbar,
} from "@/components/ui/SoftOneUi";
import { api, downloadPdf } from "@/core/api/client";
import { paginatedParams, type Paginated } from "@/core/api/pagination";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useListPageSize } from "@/core/hooks/useListPageSize";

type Factura = {
  id: number;
  numero: string;
  cliente_nombre: string;
  estado: string;
  total: string;
  total_pagado: string;
};

export default function FacturasPage() {
  const [params] = useSearchParams();
  const desde = params.get("desde");
  const qc = useQueryClient();
  const { pageSize, setPageSize, pageSizeOptions } = useListPageSize(25);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["facturas", debouncedSearch, estado, page, pageSize],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<Factura>>("/facturas/", {
        params: paginatedParams({
          search: debouncedSearch,
          page,
          pageSize,
          extra: estado ? { estado } : undefined,
        }),
      });
      return res;
    },
  });

  const desdeCotizacion = useMutation({
    mutationFn: () => api.post(`/facturas/desde-cotizacion/${desde}/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["facturas"] });
      window.history.replaceState({}, "", "/app/facturas");
    },
  });

  const emitir = useMutation({
    mutationFn: (id: number) => api.post(`/facturas/${id}/emitir/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["facturas"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/facturas/${id}/`),
    onSuccess: () => {
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["facturas"] });
    },
  });

  const list = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title="Facturas"
        subtitle="Detalle, pagos, anular y borradores"
        icon={Receipt}
        actions={
          <Link to="/app/facturas/nueva" className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Nueva factura
          </Link>
        }
      />

      {desde && (
        <div className="rounded-xl border border-[#3eafd4]/30 bg-[#f0fbff] p-4 text-sm text-[#0e7490]">
          Crear factura desde cotización #{desde}
          <button
            type="button"
            className={`${btnLink} ml-3`}
            onClick={() => desdeCotizacion.mutate()}
            disabled={desdeCotizacion.isPending}
          >
            Confirmar
          </button>
        </div>
      )}

      <SoftOneToolbar>
        <SoftOneSearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por número o cliente…"
        />
        <select
          className={`${selectClass} w-full sm:w-40`}
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos</option>
          <option value="borrador">Borrador</option>
          <option value="emitida">Emitida</option>
          <option value="anulada">Anulada</option>
        </select>
      </SoftOneToolbar>

      {isLoading ? (
        <SoftOneLoading />
      ) : list.length === 0 ? (
        <SoftOneEmpty message="No hay facturas que coincidan." />
      ) : (
        <>
          <SoftOneTable>
            <SoftOneTableHead>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Pagado</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </SoftOneTableHead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {list.map((f) => (
                <tr key={f.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link to={`/app/facturas/${f.id}`} className="text-[#0e7490] hover:underline">
                      {f.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{f.cliente_nombre}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#f0fbff] px-2 py-0.5 text-xs font-medium text-[#0e7490]">
                      {f.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">${Number(f.total).toLocaleString("es-CO")}</td>
                  <td className="px-4 py-3 text-slate-600">
                    ${Number(f.total_pagado).toLocaleString("es-CO")}
                  </td>
                  <td className="space-x-2 px-4 py-3 text-right">
                    <button
                      type="button"
                      className={btnLink}
                      onClick={() => downloadPdf(`/facturas/${f.id}/pdf/`, `${f.numero}.pdf`)}
                    >
                      PDF
                    </button>
                  {f.estado === "borrador" && (
                    <>
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => setDeleteId(f.id)}
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        className={btnSecondary + " !px-2 !py-1 text-xs"}
                        onClick={() => emitir.mutate(f.id)}
                      >
                        Emitir
                      </button>
                    </>
                  )}
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

      <ConfirmDeleteDialog
        open={deleteId != null}
        title="Eliminar factura"
        description="Solo borradores."
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && remove.mutate(deleteId)}
        isPending={remove.isPending}
      />
    </div>
  );
}
