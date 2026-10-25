import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, Plus, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { paginatedParams, type Paginated } from "@/core/api/pagination";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";

export type CategoryValue =
  | { kind: "none" }
  | { kind: "id"; id: number; label: string }
  | { kind: "new"; nombre: string };

type CategoriaRow = { id: number; nombre: string; tipo: string };

type Props = {
  label?: string;
  tipo: "producto" | "cliente";
  value: CategoryValue;
  onChange: (v: CategoryValue) => void;
  placeholder?: string;
};

export function CreatableCategorySelect({
  label,
  tipo,
  value,
  onChange,
  placeholder = "Buscar o crear categoría…",
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebouncedValue(query, 280);

  const { data: options = [], isFetching } = useQuery({
    queryKey: ["categorias", tipo, debounced],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<Paginated<CategoriaRow>>("/categorias/", {
        params: paginatedParams({ search: debounced, page: 1, pageSize: 30, extra: { tipo } }),
      });
      return data.results ?? [];
    },
  });

  const trimmed = query.trim();
  const exact = trimmed
    ? options.find((o) => o.nombre.toLowerCase() === trimmed.toLowerCase())
    : undefined;
  const showCreate = trimmed.length > 0 && !exact;

  const display =
    value.kind === "id"
      ? value.label
      : value.kind === "new"
        ? `Nueva: ${value.nombre}`
        : "";

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {label && <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listboxId}
        className={`${inputClass} flex items-center justify-between gap-2 text-left`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={display ? "truncate text-slate-800" : "truncate text-slate-400"}>
          {display || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-slate-400">
          {value.kind !== "none" && (
            <X
              className="h-4 w-4 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange({ kind: "none" });
              }}
            />
          )}
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {open && (
        <div
          id={listboxId}
          className="absolute z-30 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg"
        >
          <div className="border-b border-slate-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                autoFocus
                className={`${inputClass} pl-9`}
                placeholder="Nombre de categoría…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1 text-sm">
            {isFetching && options.length === 0 ? (
              <li className="flex justify-center gap-2 py-4 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#3eafd4]" />
              </li>
            ) : (
              <>
                {options.map((o) => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="block w-full px-3 py-2 text-left hover:bg-[#f0fbff]"
                      onClick={() => {
                        onChange({ kind: "id", id: o.id, label: o.nombre });
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      {o.nombre}
                    </button>
                  </li>
                ))}
                {showCreate && (
                  <li>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left font-medium text-[#0e7490] hover:bg-[#f0fbff]"
                      onClick={() => {
                        onChange({ kind: "new", nombre: trimmed });
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <Plus className="h-4 w-4" />
                      Crear «{trimmed}»
                    </button>
                  </li>
                )}
                {options.length === 0 && !showCreate && (
                  <li className="px-3 py-4 text-center text-slate-500">Escribe para buscar o crear</li>
                )}
              </>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

export function categoryToPayload(value: CategoryValue): Record<string, unknown> {
  if (value.kind === "id") return { categoria_id: value.id };
  if (value.kind === "new") return { categoria_nombre: value.nombre };
  return {};
}
