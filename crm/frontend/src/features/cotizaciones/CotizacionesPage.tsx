import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import {
  btnPrimary,
  selectClass,
  SoftOneAlert,
  SoftOneEmpty,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOnePagination,
  SoftOneSearchBar,
  SoftOneTable,
  SoftOneTableHead,
  SoftOneToolbar,
} from "@/components/ui/SoftOneUi";
import { CotizacionRowActions } from "@/features/cotizaciones/CotizacionRowActions";
import { api } from "@/core/api/client";
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
  factura_vigente_id?: number | null;
  factura_vigente_numero?: string | null;
};

const ESTADOS = ["", "borrador", "enviada", "aceptada", "rechazada", "vencida"];

const ESTADO_STYLE: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-700",
  enviada: "bg-amber-50 text-amber-800",
  aceptada: "bg-emerald-50 text-emerald-800",
  rechazada: "bg-red-50 text-red-700",
  vencida: "bg-slate-200 text-slate-600",
};

export default function CotizacionesPage() {
  const qc = useQueryClient();
  const { pageSize, setPageSize, pageSizeOptions } = useListPageSize(25);
  const [search, setSearch] = useState("");
  const [estado, setEstado] = useState("");
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
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
        subtitle="Flujo: borrador → enviada → aceptada → factura"
        icon={FileText}
        actions={
          <Link to="/app/cotizaciones/nueva" className={btnPrimary}>
            <Plus className="h-4 w-4" />
            Nueva cotización
          </Link>
        }
      />

      {pdfError && <SoftOneAlert>{pdfError}</SoftOneAlert>}

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
              <th className="min-w-[280px] px-4 py-3 text-right">Acciones</th>
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
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${ESTADO_STYLE[c.estado] ?? ESTADO_STYLE.borrador}`}
                    >
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">
                    ${Number(c.total).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3">
                    <CotizacionRowActions
                      id={c.id}
                      numero={c.numero}
                      estado={c.estado}
                      facturaVigenteId={c.factura_vigente_id}
                      facturaVigenteNumero={c.factura_vigente_numero}
                      onPdfError={setPdfError}
                      onDelete={() => setDeleteId(c.id)}
                      onEnviar={() => enviar.mutate(c.id)}
                      onAceptar={() => aceptar.mutate(c.id)}
                      onRechazar={() => rechazar.mutate(c.id)}
                      enviarPending={enviar.isPending}
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
