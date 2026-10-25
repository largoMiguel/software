import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
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

type Cotizacion = {
  id: number;
  numero: string;
  cliente_nombre: string;
  estado: string;
  total: string;
  fecha_emision: string;
};

const ESTADOS = ["", "borrador", "enviada", "aceptada", "rechazada", "vencida"];

export default function CotizacionesPage() {
  const qc = useQueryClient();
  const { pageSize, setPageSize, pageSizeOptions } = useListPageSize(25);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["cotizaciones", debouncedSearch, estado, page, pageSize],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<Cotizacion>>("/cotizaciones/", {
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

  const enviar = useMutation({
    mutationFn: (id: number) => api.post(`/cotizaciones/${id}/enviar/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }),
  });

  const aceptar = useMutation({
    mutationFn: (id: number) => api.post(`/cotizaciones/${id}/aceptar/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }),
  });

  const rechazar = useMutation({
    mutationFn: (id: number) => api.post(`/cotizaciones/${id}/rechazar/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotizaciones"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/cotizaciones/${id}/`),
    onSuccess: () => {
      setDeleteId(null);
      qc.invalidateQueries({ queryKey: ["cotizaciones"] });
    },
  });

  const list = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title="Cotizaciones"
        subtitle="Busca por número o cliente; filtra por estado"
        icon={FileText}
        actions={
          <Link to="/app/cotizaciones/nueva" className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Nueva cotización
          </Link>
        }
      />

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
          className={`${selectClass} w-full sm:w-44`}
          value={estado}
          onChange={(e) => {
            setEstado(e.target.value);
            setPage(1);
          }}
        >
          {ESTADOS.map((e) => (
            <option key={e || "all"} value={e}>
              {e ? e.charAt(0).toUpperCase() + e.slice(1) : "Todos los estados"}
            </option>
          ))}
        </select>
      </SoftOneToolbar>

      {isLoading ? (
        <SoftOneLoading />
      ) : list.length === 0 ? (
        <SoftOneEmpty message="No hay cotizaciones que coincidan." />
      ) : (
        <>
          <SoftOneTable>
            <SoftOneTableHead>
              <th className="px-4 py-3">Número</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </SoftOneTableHead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {list.map((c) => (
                <tr key={c.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    <Link to={`/app/cotizaciones/${c.id}`} className="text-[#0e7490] hover:underline">
                      {c.numero}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{c.cliente_nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{c.fecha_emision}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#f0fbff] px-2 py-0.5 text-xs font-medium text-[#0e7490]">
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">${Number(c.total).toLocaleString("es-CO")}</td>
                <td className="space-x-2 px-4 py-3 text-right">
                  {c.estado === "borrador" && (
                    <Link to={`/app/cotizaciones/${c.id}/editar`} className={btnLink}>
                      Editar
                    </Link>
                  )}
                  <button
                    type="button"
                    className={btnLink}
                    onClick={() => downloadPdf(`/cotizaciones/${c.id}/pdf/`, `${c.numero}.pdf`)}
                  >
                    PDF
                  </button>
                  {c.estado === "borrador" && (
                    <>
                      <button
                        type="button"
                        className="text-xs font-medium text-red-600 hover:underline"
                        onClick={() => setDeleteId(c.id)}
                      >
                        Eliminar
                      </button>
                      <button
                        type="button"
                        className={btnSecondary + " !px-2 !py-1 text-xs"}
                        onClick={() => enviar.mutate(c.id)}
                      >
                        Enviar
                      </button>
                    </>
                  )}
                    {c.estado === "enviada" && (
                      <>
                        <button
                          type="button"
                          className={btnSecondary + " !px-2 !py-1 text-xs"}
                          onClick={() => aceptar.mutate(c.id)}
                        >
                          Aceptar
                        </button>
                        <button
                          type="button"
                          className="text-xs font-medium text-red-600 hover:underline"
                          onClick={() => rechazar.mutate(c.id)}
                        >
                          Rechazar
                        </button>
                      </>
                    )}
                    {c.estado === "aceptada" && (
                      <Link to={`/app/facturas?desde=${c.id}`} className={btnLink}>
                        Facturar
                      </Link>
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
        title="Eliminar cotización"
        description="Solo borradores. Esta acción no se puede deshacer."
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId != null && remove.mutate(deleteId)}
        isPending={remove.isPending}
      />
    </div>
  );
}
