import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Loader2, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { inputClass } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { paginatedParams, type Paginated } from "@/core/api/pagination";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";

export type SearchableOption = { id: number; label: string; hint?: string };

type Props = {
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  value: number | "";
  onChange: (id: number | "") => void;
  endpoint: string;
  mapOption: (row: Record<string, unknown>) => SearchableOption;
  disabled?: boolean;
  pageSize?: number;
};

export function SearchableSelect({
  label,
  placeholder = "Buscar y seleccionar…",
  searchPlaceholder = "Escribe para buscar…",
  value,
  onChange,
  endpoint,
  mapOption,
  disabled,
  pageSize = 25,
}: Props) {
  const listboxId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 280);

  const { data: selectedRow } = useQuery({
    queryKey: ["searchable-select-value", endpoint, value],
    enabled: value !== "",
    queryFn: async () => {
      const { data } = await api.get<Record<string, unknown>>(`${endpoint}${value}/`);
      return data;
    },
  });

  const { data: options = [], isFetching } = useQuery({
    queryKey: ["searchable-select", endpoint, debouncedQuery, pageSize],
    enabled: open,
    queryFn: async () => {
      const { data } = await api.get<Paginated<Record<string, unknown>> | Record<string, unknown>[]>(
        endpoint,
        { params: paginatedParams({ search: debouncedQuery, page: 1, pageSize }) },
      );
      const rows = Array.isArray(data) ? data : (data.results ?? []);
      return rows.map(mapOption);
    },
  });

  const selectedLabel =
    value === ""
      ? ""
      : selectedRow
        ? mapOption(selectedRow as Record<string, unknown>).label
        : `#${value}`;

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={rootRef} className="relative">
      {label && (
        <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      )}
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-controls={listboxId}
        className={`${inputClass} flex items-center justify-between gap-2 text-left ${disabled ? "opacity-50" : ""}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={selectedLabel ? "truncate text-slate-800" : "truncate text-slate-400"}>
          {selectedLabel || placeholder}
        </span>
        <span className="flex shrink-0 items-center gap-1 text-slate-400">
          {value !== "" && (
            <X
              className="h-4 w-4 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                onChange("");
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
                placeholder={searchPlaceholder}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>
          <ul className="max-h-56 overflow-y-auto py-1 text-sm">
            {isFetching && options.length === 0 ? (
              <li className="flex items-center justify-center gap-2 px-3 py-4 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-[#3eafd4]" />
                Buscando…
              </li>
            ) : options.length === 0 ? (
              <li className="px-3 py-4 text-center text-slate-500">Sin resultados</li>
            ) : (
              options.map((opt) => (
                <li key={opt.id}>
                  <button
                    type="button"
                    className={`flex w-full flex-col px-3 py-2 text-left hover:bg-[#f0fbff] ${
                      value === opt.id ? "bg-[#f0fbff]" : ""
                    }`}
                    onClick={() => {
                      onChange(opt.id);
                      setOpen(false);
                      setQuery("");
                    }}
                  >
                    <span className="font-medium text-slate-800">{opt.label}</span>
                    {opt.hint && <span className="text-xs text-slate-500">{opt.hint}</span>}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
