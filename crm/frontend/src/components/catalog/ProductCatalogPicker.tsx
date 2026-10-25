import { useQuery } from "@tanstack/react-query";
import { Loader2, Plus } from "lucide-react";
import { useState } from "react";
import {
  CreatableCategorySelect,
  type CategoryValue,
} from "@/components/ui/CreatableCategorySelect";
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
  tipo: string;
  categoria_nombre_display?: string;
};

type Props = {
  onPick: (product: CatalogProduct) => void;
};

export function ProductCatalogPicker({ onPick }: Props) {
  const [search, setSearch] = useState("");
  const [categoria, setCategoria] = useState<CategoryValue>({ kind: "none" });
  const debounced = useDebouncedValue(search, 280);
  const categoriaId = categoria.kind === "id" ? categoria.id : undefined;

  const { data, isFetching } = useQuery({
    queryKey: ["product-catalog-picker", debounced, categoriaId],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<CatalogProduct>>("/productos/", {
        params: paginatedParams({
          search: debounced,
          page: 1,
          pageSize: 30,
          extra: categoriaId ? { categoria: categoriaId } : undefined,
        }),
      });
      return res.results ?? [];
    },
  });

  const list = data ?? [];

  return (
    <SoftOneCard title="Agregar del catálogo" className="lg:sticky lg:top-4">
      <div className="space-y-3">
        <CreatableCategorySelect
          tipo="producto"
          value={categoria}
          onChange={(v) => setCategoria(v.kind === "new" ? { kind: "none" } : v)}
          placeholder="Filtrar por categoría…"
        />
        <input
          className={inputClass}
          placeholder="Buscar por nombre, código o descripción…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <ul className="max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-lg border border-slate-200">
          {isFetching && list.length === 0 ? (
            <li className="flex justify-center gap-2 py-8 text-sm text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin text-[#3eafd4]" />
              Cargando catálogo…
            </li>
          ) : list.length === 0 ? (
            <li className="py-8 text-center text-sm text-slate-500">Sin productos</li>
          ) : (
            list.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-800">{p.nombre}</p>
                  <p className="truncate text-xs text-slate-500">
                    {p.categoria_nombre_display ? `${p.categoria_nombre_display} · ` : ""}
                    {p.codigo ? `${p.codigo} · ` : ""}
                    ${Number(p.precio).toLocaleString("es-CO")} · IVA {p.iva_porcentaje}%
                  </p>
                </div>
                <button
                  type="button"
                  className={btnSecondary + " shrink-0 !px-2 !py-1.5 text-xs"}
                  onClick={() => onPick(p)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Agregar
                </button>
              </li>
            ))
          )}
        </ul>
      </div>
    </SoftOneCard>
  );
}
