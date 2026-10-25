import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";

export const inputClass =
  "h-10 w-full rounded-[0.3rem] border border-slate-300 px-3 text-sm text-slate-700 focus:border-[#3eafd4] focus:outline-none focus:ring-1 focus:ring-[#3eafd4]";

export const selectClass = inputClass;

export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-[0.3rem] bg-[#3eafd4] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2f9fc2] disabled:opacity-50";

export const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-[0.3rem] border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50";

export const btnLink =
  "text-sm font-medium text-[#0e7490] underline-offset-2 hover:text-[#3eafd4] hover:underline disabled:opacity-50";

export function SoftOneField({
  label,
  children,
  className = "",
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export function SoftOnePageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#3eafd4]/10 text-[#3eafd4]">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-[#111827] sm:text-2xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">{subtitle}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function SoftOneCard({
  title,
  icon,
  children,
  className = "",
}: {
  title?: ReactNode;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>
      {title && (
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            {icon}
            {title}
          </h2>
        </div>
      )}
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

export function SoftOneLoading({ label = "Cargando…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white p-8 text-slate-500 shadow-sm">
      <Loader2 className="h-5 w-5 animate-spin text-[#3eafd4]" />
      {label}
    </div>
  );
}

export function SoftOneTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[480px] text-left text-sm">{children}</table>
    </div>
  );
}

export function SoftOneTableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-slate-200 bg-slate-50/90 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {children}
      </tr>
    </thead>
  );
}

export function SoftOneEmpty({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function SoftOneSearchBar({
  value,
  onChange,
  placeholder = "Buscar…",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={`relative min-w-[200px] flex-1 ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${inputClass} pl-10`}
      />
    </div>
  );
}

export function SoftOneToolbar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-center">
      {children}
    </div>
  );
}

export function SoftOnePagination({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  if (total === 0 && !pageSizeOptions?.length) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <span>
          {from}–{to} de {total}
        </span>
        {pageSizeOptions && onPageSizeChange && (
          <label className="flex items-center gap-2 text-slate-600">
            <span className="text-xs">Por página</span>
            <select
              className={`${selectClass} !h-9 !w-auto py-0`}
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={btnSecondary + " !px-2 !py-1.5"}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="min-w-[5rem] text-center text-slate-700">
          {page} / {totalPages}
        </span>
        <button
          type="button"
          className={btnSecondary + " !px-2 !py-1.5"}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function SoftOneAlert({ variant = "error", children }: { variant?: "error" | "info"; children: ReactNode }) {
  const styles =
    variant === "error"
      ? "border-red-200 bg-red-50 text-red-800"
      : "border-[#3eafd4]/30 bg-[#f0fbff] text-[#0e7490]";
  return <div className={`rounded-xl border px-4 py-3 text-sm ${styles}`}>{children}</div>;
}
