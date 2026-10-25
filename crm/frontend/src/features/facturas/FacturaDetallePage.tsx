import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Receipt } from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  SoftOneAlert,
  SoftOneCard,
  SoftOneField,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOneTable,
  SoftOneTableHead,
} from "@/components/ui/SoftOneUi";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import { api } from "@/core/api/client";
import { formatApiError } from "@/core/api/pagination";
import type { CotizacionItemApi } from "@/features/cotizaciones/cotizacionFormUtils";

type Pago = {
  id: number;
  fecha: string;
  monto: string;
  metodo: string;
  referencia: string;
};

type FacturaDetail = {
  id: number;
  numero: string;
  estado: string;
  cliente_nombre: string;
  fecha_emision: string;
  fecha_vencimiento: string | null;
  notas: string;
  subtotal: string;
  iva_total: string;
  total: string;
  total_pagado: string;
  saldo_pendiente: string;
  items: CotizacionItemApi[];
  pagos: Pago[];
};

export default function FacturaDetallePage() {
  const { id } = useParams<{ id: string }>();
  const facturaId = Number(id);
  const qc = useQueryClient();
  const [pagoForm, setPagoForm] = useState({ fecha: "", monto: "", metodo: "", referencia: "" });
  const [pagoError, setPagoError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["factura", facturaId],
    enabled: Number.isFinite(facturaId),
    queryFn: async () => {
      const { data: res } = await api.get<FacturaDetail>(`/facturas/${facturaId}/`);
      return res;
    },
  });

  const emitir = useMutation({
    mutationFn: () => api.post(`/facturas/${facturaId}/emitir/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["factura", facturaId] }),
  });

  const anular = useMutation({
    mutationFn: () => api.post(`/facturas/${facturaId}/anular/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["factura", facturaId] }),
  });

  const registrarPago = useMutation({
    mutationFn: () =>
      api.post(`/facturas/${facturaId}/pagos/`, {
        fecha: pagoForm.fecha,
        monto: pagoForm.monto,
        metodo: pagoForm.metodo,
        referencia: pagoForm.referencia,
      }),
    onSuccess: () => {
      setPagoForm({ fecha: "", monto: "", metodo: "", referencia: "" });
      setPagoError(null);
      qc.invalidateQueries({ queryKey: ["factura", facturaId] });
      qc.invalidateQueries({ queryKey: ["facturas"] });
    },
    onError: (err) => setPagoError(formatApiError(err)),
  });

  if (!Number.isFinite(facturaId)) return null;
  if (isLoading) return <SoftOneLoading label="Cargando factura…" />;
  if (isError || !data) return <SoftOneAlert>No se pudo cargar la factura.</SoftOneAlert>;

  const canPay =
    data.estado !== "borrador" && data.estado !== "anulada" && Number(data.saldo_pendiente) > 0;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title={data.numero}
        subtitle={`${data.cliente_nombre} · ${data.estado}`}
        icon={Receipt}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/app/facturas" className={btnSecondary}>
              Volver
            </Link>
            {data.estado === "borrador" && (
              <Link to={`/app/facturas/${data.id}/editar`} className={btnSecondary}>
                Editar
              </Link>
            )}
            <PdfDownloadButton
              path={`/facturas/${data.id}/pdf/`}
              filename={`${data.numero}.pdf`}
              className={btnSecondary}
              onError={setPdfError}
            />
            {data.estado === "borrador" && (
              <button type="button" className={btnPrimary} onClick={() => emitir.mutate()} disabled={emitir.isPending}>
                Emitir
              </button>
            )}
            {data.estado !== "anulada" && data.estado !== "borrador" && (
              <button type="button" className={btnSecondary} onClick={() => anular.mutate()} disabled={anular.isPending}>
                Anular
              </button>
            )}
          </div>
        }
      />

      {pdfError && <SoftOneAlert>{pdfError}</SoftOneAlert>}

      <div className="grid gap-4 sm:grid-cols-3">
        <SoftOneCard title="Totales">
          <p className="text-sm text-slate-600">
            Subtotal: ${Number(data.subtotal).toLocaleString("es-CO")}
          </p>
          <p className="text-sm text-slate-600">IVA: ${Number(data.iva_total).toLocaleString("es-CO")}</p>
          <p className="mt-2 text-lg font-semibold">Total: ${Number(data.total).toLocaleString("es-CO")}</p>
          <p className="mt-1 text-sm text-emerald-700">
            Pagado: ${Number(data.total_pagado).toLocaleString("es-CO")}
          </p>
          <p className="text-sm font-medium text-[#0e7490]">
            Saldo: ${Number(data.saldo_pendiente).toLocaleString("es-CO")}
          </p>
        </SoftOneCard>
        <SoftOneCard title="Fechas" className="sm:col-span-2">
          <p className="text-sm">Emisión: {data.fecha_emision}</p>
          <p className="text-sm">Vencimiento: {data.fecha_vencimiento || "—"}</p>
          {data.notas && <p className="mt-2 text-sm text-slate-600">{data.notas}</p>}
        </SoftOneCard>
      </div>

      <SoftOneCard title="Líneas">
        <SoftOneTable>
          <SoftOneTableHead>
            <th className="px-4 py-2">Descripción</th>
            <th className="px-4 py-2 text-right">Cant.</th>
            <th className="px-4 py-2 text-right">Total</th>
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

      {canPay && (
        <SoftOneCard title="Registrar pago">
          {pagoError && <SoftOneAlert>{pagoError}</SoftOneAlert>}
          <form
            className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
            onSubmit={(e) => {
              e.preventDefault();
              registrarPago.mutate();
            }}
          >
            <SoftOneField label="Fecha">
              <input
                type="date"
                className={inputClass}
                value={pagoForm.fecha}
                onChange={(e) => setPagoForm({ ...pagoForm, fecha: e.target.value })}
                required
              />
            </SoftOneField>
            <SoftOneField label="Monto">
              <input
                className={inputClass}
                value={pagoForm.monto}
                onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
                required
              />
            </SoftOneField>
            <SoftOneField label="Método">
              <input
                className={inputClass}
                value={pagoForm.metodo}
                onChange={(e) => setPagoForm({ ...pagoForm, metodo: e.target.value })}
              />
            </SoftOneField>
            <SoftOneField label="Referencia">
              <input
                className={inputClass}
                value={pagoForm.referencia}
                onChange={(e) => setPagoForm({ ...pagoForm, referencia: e.target.value })}
              />
            </SoftOneField>
            <button type="submit" className={btnPrimary} disabled={registrarPago.isPending}>
              Registrar
            </button>
          </form>
        </SoftOneCard>
      )}

      {data.pagos.length > 0 && (
        <SoftOneCard title="Historial de pagos">
          <SoftOneTable>
            <SoftOneTableHead>
              <th className="px-4 py-2">Fecha</th>
              <th className="px-4 py-2">Método</th>
              <th className="px-4 py-2 text-right">Monto</th>
            </SoftOneTableHead>
            <tbody>
              {data.pagos.map((p) => (
                <tr key={p.id} className="border-b border-slate-100">
                  <td className="px-4 py-2">{p.fecha}</td>
                  <td className="px-4 py-2">{p.metodo || "—"}</td>
                  <td className="px-4 py-2 text-right">${Number(p.monto).toLocaleString("es-CO")}</td>
                </tr>
              ))}
            </tbody>
          </SoftOneTable>
        </SoftOneCard>
      )}
    </div>
  );
}
