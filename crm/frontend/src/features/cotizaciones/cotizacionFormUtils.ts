export type LineDraft = {
  key: string;
  producto_id?: number;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  iva_porcentaje: string;
  descuento_porcentaje: string;
};

export type CotizacionItemApi = {
  id?: number;
  producto_id: number | null;
  descripcion: string;
  cantidad: string;
  precio_unitario: string;
  iva_porcentaje: string;
  descuento_porcentaje: string;
  total_linea?: string;
};

export function newLine(partial?: Partial<LineDraft>): LineDraft {
  return {
    key: crypto.randomUUID(),
    descripcion: "",
    cantidad: "1",
    precio_unitario: "0",
    iva_porcentaje: "19",
    descuento_porcentaje: "0",
    ...partial,
  };
}

export function lineTotals(line: LineDraft) {
  const qty = Number(line.cantidad) || 0;
  const price = Number(line.precio_unitario) || 0;
  const disc = Number(line.descuento_porcentaje) || 0;
  const iva = Number(line.iva_porcentaje) || 0;
  const sub = qty * price * (1 - disc / 100);
  const ivaAmt = sub * (iva / 100);
  return { sub, ivaAmt, total: sub + ivaAmt };
}

export function linesToPayload(lines: LineDraft[]): CotizacionItemApi[] {
  return lines
    .filter((l) => l.descripcion.trim())
    .map((l) => ({
      producto_id: l.producto_id ?? null,
      descripcion: l.descripcion.trim(),
      cantidad: l.cantidad,
      precio_unitario: l.precio_unitario,
      iva_porcentaje: l.iva_porcentaje,
      descuento_porcentaje: l.descuento_porcentaje || "0",
    }));
}

export function itemsFromApi(items: CotizacionItemApi[]): LineDraft[] {
  if (!items.length) return [];
  return items.map((it) =>
    newLine({
      producto_id: it.producto_id ?? undefined,
      descripcion: it.descripcion,
      cantidad: String(it.cantidad),
      precio_unitario: String(it.precio_unitario),
      iva_porcentaje: String(it.iva_porcentaje),
      descuento_porcentaje: String(it.descuento_porcentaje ?? "0"),
    }),
  );
}
