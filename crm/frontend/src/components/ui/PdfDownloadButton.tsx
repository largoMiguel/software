import { FileText } from "lucide-react";
import { useState } from "react";
import { PdfViewerModal } from "@/components/ui/PdfViewerModal";
import { btnAction } from "@/components/ui/SoftOneUi";
import { fetchPdfBlob } from "@/core/api/client";

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
  className = btnAction,
  label = "Ver PDF",
  title = "Abrir vista previa del PDF (sin descarga automatica)",
  onError,
}: Props) {
  const [pending, setPending] = useState(false);
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  function closeViewer() {
    setViewerOpen(false);
    setViewerUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  return (
    <>
      <button
        type="button"
        className={className}
        title={title}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          try {
            const blob = await fetchPdfBlob(path);
            const pdfBlob = blob.type.includes("pdf") ? blob : new Blob([blob], { type: "application/pdf" });
            const url = URL.createObjectURL(pdfBlob);
            setViewerUrl(url);
            setViewerOpen(true);
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
      <PdfViewerModal
        open={viewerOpen}
        title={filename.replace(/\.pdf$/i, "")}
        objectUrl={viewerUrl}
        onClose={closeViewer}
      />
    </>
  );
}
