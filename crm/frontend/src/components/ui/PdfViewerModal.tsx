import { Printer, X } from "lucide-react";
import { useEffect } from "react";
import { btnPrimary, btnSecondary } from "@/components/ui/SoftOneUi";

type Props = {
  open: boolean;
  title: string;
  objectUrl: string | null;
  onClose: () => void;
};

export function PdfViewerModal({ open, title, objectUrl, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !objectUrl) return null;

  function printPdf() {
    const frame = document.getElementById("crm-pdf-viewer-frame") as HTMLIFrameElement | null;
    frame?.contentWindow?.print();
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900/70 p-3 sm:p-6">
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">Vista previa · imprime o guarda desde el visor del navegador</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={printPdf}>
              <Printer className="h-4 w-4" />
              Imprimir
            </button>
            <button type="button" className={btnPrimary} onClick={onClose}>
              <X className="h-4 w-4" />
              Cerrar
            </button>
          </div>
        </div>
        <iframe
          id="crm-pdf-viewer-frame"
          title={title}
          src={objectUrl}
          className="min-h-0 flex-1 w-full border-0 bg-slate-100"
        />
      </div>
    </div>
  );
}
