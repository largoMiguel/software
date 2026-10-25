import type { ReactNode } from "react";

type AuthShellProps = {
  subtitle?: string;
  children: ReactNode;
};

export default function AuthShell({ subtitle = "Cotizaciones y facturación multiempresa", children }: AuthShellProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f6f8] px-4 py-10">
      <div className="mb-8 flex flex-col items-center gap-1 text-center">
        <div className="flex items-center gap-2.5">
          <div className="grid h-10 w-10 place-items-center rounded-lg bg-[#3eafd4] text-sm font-bold text-white shadow-sm">
            CRM
          </div>
          <div className="text-left">
            <p className="text-xl font-semibold leading-tight text-slate-800">
              SoftOne <strong className="font-bold">CRM</strong>
            </p>
            <p className="text-xs text-slate-500">by SoftOne360</p>
          </div>
        </div>
        {subtitle && <p className="mt-3 max-w-sm text-sm text-slate-600">{subtitle}</p>}
      </div>

      <div className="w-full max-w-md">{children}</div>

      <footer className="mt-10 text-xs text-slate-500">
        © {new Date().getFullYear()} SoftOne360
      </footer>
    </div>
  );
}
