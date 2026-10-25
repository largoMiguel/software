import { useMutation } from "@tanstack/react-query";
import { FileText, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  type CatalogProduct,
  ProductCatalogPicker,
} from "@/components/catalog/ProductCatalogPicker";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import {
  btnPrimary,
  btnSecondary,
  inputClass,
  SoftOneAlert,
  SoftOneCard,
  SoftOneField,
  SoftOnePageHeader,
  SoftOneTable,
  SoftOneTableHead,
} from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { formatApiError } from "@/core/api/pagination";
import {
  itemsFromApi,
  lineTotals,
  linesToPayload,
  newLine,
  type CotizacionItemApi,
  type LineDraft,
} from "@/features/cotizaciones/cotizacionFormUtils";

type Props = {
  mode: "create" | "edit";
  cotizacionId?: number;
  numero?: string;
  initialClienteId?: number;
  initialNotas?: string;
  initialFechaVencimiento?: string | null;
  initialItems?: CotizacionItemApi[];
  onSaved: () => void;
};

export function CotizacionEditor({
  mode,
  cotizacionId,
  numero,
  initialClienteId,
  initialNotas = "",
  initialFechaVencimiento,
  initialItems,
  onSaved,
}: Props) {
  const [clienteId, setClienteId] = useState<number | "">(initialClienteId ?? "");
  const [notas, setNotas] = useState(initialNotas);
  const [fechaVencimiento, setFechaVencimiento] = useState(initialFechaVencimiento ?? "");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    initialItems ? itemsFromApi(initialItems) : [newLine()],
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialClienteId != null) setClienteId(initialClienteId);
  }, [initialClienteId]);

  const totals = useMemo(() => {
    let sub = 0;
    let iva = 0;
    for (const line of lines) {
      const t = lineTotals(line);
      sub += t.sub;
      iva += t.ivaAmt;
    }
    return { sub, iva, total: sub + iva };
  }, [lines]);

  function addFromCatalog(p: CatalogProduct) {
    setLines((prev) => {
      const existing = prev.find((l) => l.producto_id === p.id);
      if (existing) {
        return prev.map((l) =>
          l.producto_id === p.id
            ? { ...l, cantidad: String((Number(l.cantidad) || 0) + 1) }
            : l,
        );
      }
      return [
        ...prev,
        newLine({
          producto_id: p.id,
          descripcion: p.nombre,
          precio_unitario: p.precio,
          iva_porcentaje: p.iva_porcentaje,
        }),
      ];
    });
  }

  function updateLine(key: string, patch: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => (prev.length <= 1 ? prev : prev.filter((l) => l.key !== key)));
  }

  const save = useMutation({
    mutationFn: async () => {
      setError(null);
      if (!clienteId) throw new Error("Selecciona un cliente");
      const items = linesToPayload(lines);
      if (items.length === 0) throw new Error("Agrega al menos una línea con descripción");
      const body = {
        cliente_id: clienteId,
        notas,
        fecha_vencimiento: fechaVencimiento || null,
        items,
      };
      if (mode === "create") {
        await api.post("/cotizaciones/", body);
      } else {
        await api.patch(`/cotizaciones/${cotizacionId}/`, body);
      }
    },
    onSuccess: onSaved,
    onError: (err) => setError(formatApiError(err)),
  });

  const title = mode === "create" ? "Nueva cotización" : `Editar ${numero ?? "cotización"}`;
  const subtitle =
    mode === "create"
      ? "Cliente, varias líneas y búsqueda en catálogo"
      : "Solo borradores. Ajusta líneas y condiciones.";

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title={title}
        subtitle={subtitle}
        icon={FileText}
        actions={
          <Link to="/app/cotizaciones" className={btnSecondary}>
            Volver
          </Link>
        }
      />

      {error && <SoftOneAlert>{error}</SoftOneAlert>}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <SoftOneCard title="Cliente y condiciones">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <SearchableSelect
                  label="Cliente"
                  value={clienteId}
                  onChange={setClienteId}
                  endpoint="/clientes/"
                  placeholder="Buscar cliente por nombre, NIT o email…"
                  mapOption={(row) => ({
                    id: Number(row.id),
                    label: String(row.razon_social ?? ""),
                    hint: [row.documento, row.email].filter(Boolean).join(" · ") || undefined,
                  })}
                />
              </div>
              <SoftOneField label="Válida hasta (opcional)">
                <input
                  type="date"
                  className={inputClass}
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                />
              </SoftOneField>
              <SoftOneField label="Notas (opcional)" className="sm:col-span-2">
                <textarea
                  className={`${inputClass} min-h-[72px] py-2`}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Condiciones comerciales, plazo de entrega…"
                />
              </SoftOneField>
            </div>
          </SoftOneCard>

          <SoftOneCard title="Líneas de la cotización">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                className={btnSecondary + " !px-2 !py-1 text-xs"}
                onClick={() => setLines((p) => [...p, newLine()])}
              >
                <Plus className="h-3.5 w-3.5" />
                Línea manual
              </button>
            </div>
            <SoftOneTable>
              <SoftOneTableHead>
                <th className="min-w-[180px] px-2 py-2">Descripción</th>
                <th className="w-20 px-2 py-2">Cant.</th>
                <th className="w-28 px-2 py-2">Precio</th>
                <th className="w-16 px-2 py-2">Dto %</th>
                <th className="w-16 px-2 py-2">IVA %</th>
                <th className="w-24 px-2 py-2 text-right">Total</th>
                <th className="w-10 px-2 py-2" />
              </SoftOneTableHead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-b border-slate-100 align-top last:border-0">
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={line.descripcion}
                        onChange={(e) => updateLine(line.key, { descripcion: e.target.value })}
                        placeholder="Producto o servicio"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={line.cantidad}
                        onChange={(e) => updateLine(line.key, { cantidad: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={line.precio_unitario}
                        onChange={(e) => updateLine(line.key, { precio_unitario: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={line.descuento_porcentaje}
                        onChange={(e) =>
                          updateLine(line.key, { descuento_porcentaje: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        className={inputClass}
                        value={line.iva_porcentaje}
                        onChange={(e) => updateLine(line.key, { iva_porcentaje: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-2 text-right text-sm font-medium text-slate-700">
                      ${lineTotals(line).total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}
                    </td>
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        onClick={() => removeLine(line.key)}
                        aria-label="Quitar línea"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </SoftOneTable>

            <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 text-sm sm:ml-auto sm:max-w-xs">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>${totals.sub.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>IVA</span>
                <span>${totals.iva.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-base font-semibold text-slate-800">
                <span>Total</span>
                <span>${totals.total.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</span>
              </div>
            </div>

            <button
              type="button"
              className={`${btnPrimary} mt-4 w-full sm:w-auto`}
              onClick={() => save.mutate()}
              disabled={save.isPending}
            >
              {save.isPending
                ? "Guardando…"
                : mode === "create"
                  ? "Crear cotización"
                  : "Guardar cambios"}
            </button>
          </SoftOneCard>
        </div>

        <ProductCatalogPicker onPick={addFromCatalog} />
      </div>
    </div>
  );
}
