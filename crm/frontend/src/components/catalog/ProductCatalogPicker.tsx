import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus, Search } from "lucide-react";
import { useState } from "react";
import { btnSecondary, inputClass, SoftOneCard } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { paginatedParams, type Paginated } from "@/core/api/pagination";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";

export type CatalogProduct = {
  id: number;
  codigo: string;
  nombre: string;
  precio: string;
  iva_porcentaje: string;
  precio_incluye_iva?: boolean;
  tipo: string;
  categoria_nombre_display?: string;
};

type Props = {
  onPick: (product: CatalogProduct) => void;
  /** Tarjeta lateral (legacy) o barra compacta sobre la tabla de líneas */
  variant?: "card" | "inline";
};

export function ProductCatalogPicker({ onPick, variant = "inline" }: Props) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const debounced = useDebouncedValue(search, 280);
  const showResults = focused && debounced.trim().length >= 1;

  const { data, isFetching } = useQuery({
    queryKey: ["product-catalog-picker", debounced],
    enabled: debounced.trim().length >= 1,
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<CatalogProduct>>("/productos/", {
        params: paginatedParams({
          search: debounced,
          page: 1,
          pageSize: 20,
        }),
      });
      return res.results ?? [];
    },
  });

  const list = data ?? [];

  const searchBlock = (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className={`${inputClass} pl-9`}
        placeholder="Buscar en catálogo por nombre o código…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 150)}
      />
      {showResults && (
        <ul className="absolute z-20 mt-1 max-h-60 w-full divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
          {isFetching && list.length === 0 ? (
            <li className="flex justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#3eafd4]" />
              Buscando…
            </li>
          ) : list.length === 0 ? (
            <li className="py-6 text-center text-sm text-slate-500">Sin coincidencias</li>
          ) : (
            list.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-slate-50"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onPick(p);
                    setSearch("");
                    setFocused(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-slate-800">{p.nombre}</p>
                    <p className="truncate text-xs text-slate-500">
                      {p.codigo ? `${p.codigo} · ` : ""}$
                      {Number(p.precio).toLocaleString("es-CO")} · IVA {p.iva_porcentaje}%
                    </p>
                  </div>
                  <span className={btnSecondary + " shrink-0 !px-2 !py-1 text-xs pointer-events-none"}>
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );

  if (variant === "card") {
    return (
      <SoftOneCard title="Agregar del catálogo" className="lg:sticky lg:top-4">
        {searchBlock}
      </SoftOneCard>
    );
  }

  return searchBlock;
}
