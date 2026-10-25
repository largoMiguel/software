import { FileDown } from "lucide-react";
import { useState } from "react";
import { btnSecondary } from "@/components/ui/SoftOneUi";
import { downloadPdf } from "@/core/api/client";

type Props = {
  path: string;
  filename: string;
  className?: string;
  label?: string;
  onError?: (message: string) => void;
};

export function PdfDownloadButton({
  path,
  filename,
  className = btnSecondary + " !px-2 !py-1 text-xs",
  label = "PDF",
  onError,
}: Props) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className={className}
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          await downloadPdf(path, filename);
        } catch (e) {
          const msg = e instanceof Error ? e.message : "No se pudo descargar el PDF";
          onError?.(msg);
        } finally {
          setPending(false);
        }
      }}
    >
      <FileDown className="h-3.5 w-3.5" />
      {pending ? "…" : label}
    </button>
  );
}
