import { FileText } from "lucide-react";
import { useState } from "react";
import { btnSecondary } from "@/components/ui/SoftOneUi";
import { openPdfViewer } from "@/core/api/client";

type Props = {
  path: string;
  filename: string;
  className?: string;
  label?: string;
  title?: string;
  onError?: (message: string) => void;
};

export function PdfDownloadButton({
  path,
  filename,
  className = btnSecondary + " !px-2 !py-1 text-xs",
  label = "Ver PDF",
  title = "Abrir en una pestaña nueva para ver, imprimir o descargar",
  onError,
}: Props) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={className}
      title={title}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await openPdfViewer(path, filename);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "No se pudo abrir el PDF";
          onError?.(msg);
        } finally {
          setPending(false);
        }
      }}
    >
      <FileText className="h-3.5 w-3.5" />
      {pending ? "…" : label}
    </button>
  );
}
