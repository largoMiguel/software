import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileText } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import {
  btnPrimary,
  btnSecondary,
  SoftOneAlert,
  SoftOneCard,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOneTable,
  SoftOneTableHead,
} from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import type { CotizacionItemApi } from "@/features/cotizaciones/cotizacionFormUtils";

type CotizacionDetail = {
  id: number;
  numero: string;
  estado: string;
  cliente_nombre: string;
  cliente_id: number;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  notas: string;
  subtotal: string;
  iva_total: string;
  total: string;
  items: CotizacionItemApi[];
};

export default function CotizacionDetallePage() {
  const { id } = useParams<{ id: string }>();
  const cotId = Number(id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cotizacion", cotId],
    enabled: Number.isFinite(cotId),
    queryFn: async () => {
      const { data: res } = await api.get<CotizacionDetail>(`/cotizaciones/${cotId}/`);
      return res;
    },
  });

  const enviar = useMutation({
    mutationFn: () => api.post(`/cotizaciones/${cotId}/enviar/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotizacion", cotId] }),
  });

  const aceptar = useMutation({
    mutationFn: () => api.post(`/cotizaciones/${cotId}/aceptar/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotizacion", cotId] }),
  });

  const rechazar = useMutation({
    mutationFn: () => api.post(`/cotizaciones/${cotId}/rechazar/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["cotizacion", cotId] }),
  });

  const duplicar = useMutation({
    mutationFn: async () => {
      if (!data) return;
      const { data: created } = await api.post("/cotizaciones/", {
        cliente_id: data.cliente_id,
        notas: data.notas ? `Copia de ${data.numero}. ${data.notas}` : `Copia de ${data.numero}`,
        fecha_vencimiento: data.fecha_vencimiento,
        items: data.items.map((it) => ({
          producto_id: it.producto_id,
          descripcion: it.descripcion,
          cantidad: it.cantidad,
          precio_unitario: it.precio_unitario,
          iva_porcentaje: it.iva_porcentaje,
          descuento_porcentaje: it.descuento_porcentaje || "0",
        })),
      });
      return created as { id: number };
    },
    onSuccess: (res) => {
      if (res?.id) navigate(`/app/cotizaciones/${res.id}/editar`);
    },
  });

  if (!Number.isFinite(cotId)) return null;
  if (isLoading) return <SoftOneLoading />;
  if (isError || !data) return <SoftOneAlert>No se pudo cargar.</SoftOneAlert>;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title={data.numero}
        subtitle={`${data.cliente_nombre} · ${data.estado}`}
        icon={FileText}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/cotizaciones" className={btnSecondary}>
              Volver
            </Link>
            {data.estado === "borrador" && (
              <Link to={`/app/cotizaciones/${data.id}/editar`} className={btnSecondary}>
                Editar
              </Link>
            )}
            <button type="button" className={btnSecondary} onClick={() => duplicar.mutate()} disabled={duplicar.isPending}>
              Duplicar
            </button>
            <PdfDownloadButton
              path={`/cotizaciones/${data.id}/pdf/`}
              filename={`${data.numero}.pdf`}
              className={btnSecondary}
              onError={setPdfError}
            />
            {data.estado === "borrador" && (
              <button type="button" className={btnPrimary} onClick={() => enviar.mutate()} disabled={enviar.isPending}>
                Enviar
              </button>
            )}
            {data.estado === "enviada" && (
              <>
                <button type="button" className={btnSecondary} onClick={() => aceptar.mutate()} disabled={aceptar.isPending}>
                  Aceptar
                </button>
                <button type="button" className={btnSecondary} onClick={() => rechazar.mutate()} disabled={rechazar.isPending}>
                  Rechazar
                </button>
              </>
            )}
            {data.estado === "aceptada" && (
              <Link to={`/app/facturas?desde=${data.id}`} className={btnPrimary}>
                Facturar
              </Link>
            )}
          </div>
        }
      />

      {pdfError && <SoftOneAlert>{pdfError}</SoftOneAlert>}

      <SoftOneCard title="Resumen">
        <p className="text-sm">Emisión: {data.fecha_emision}</p>
        <p className="text-sm">Válida hasta: {data.fecha_vencimiento || "—"}</p>
        <p className="mt-2 text-lg font-semibold">Total: ${Number(data.total).toLocaleString("es-CO")}</p>
        {data.notas && <p className="mt-2 text-sm text-slate-600">{data.notas}</p>}
      </SoftOneCard>

      <SoftOneCard title="Líneas">
        <SoftOneTable>
          <SoftOneTableHead>
            <th className="px-4 py-2">Descripción</th>
            <th className="px-4 py-2 text-right">Cant.</th>
            <th className="px-4 py-2 text-right">Total línea</th>
          </SoftOneTableHead>
          <tbody>
            {data.items.map((it) => (
              <tr key={it.id ?? it.descripcion} className="border-b border-slate-100">
                <td className="px-4 py-2">{it.descripcion}</td>
                <td className="px-4 py-2 text-right">{it.cantidad}</td>
                <td className="px-4 py-2 text-right">
                  ${Number(it.total_linea ?? 0).toLocaleString("es-CO")}
                </td>
              </tr>
            ))}
          </tbody>
        </SoftOneTable>
      </SoftOneCard>
    </div>
  );
}
