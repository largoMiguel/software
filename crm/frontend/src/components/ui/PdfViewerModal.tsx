import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Props = {
  open: boolean;
  title: string;
  pdfBlob: Blob | null;
  onClose: () => void;
};

export function PdfViewerModal({ open, title, pdfBlob, onClose }: Props) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || !pdfBlob) {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setObjectUrl(null);
      return;
    }

    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(pdfBlob);
    objectUrlRef.current = url;
    setObjectUrl(url);

    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [open, pdfBlob]);

  if (!open || !pdfBlob || !objectUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-slate-900/75 p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="relative mx-auto flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-slate-800 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm transition hover:bg-black/60"
          title="Cerrar"
          aria-label="Cerrar visor"
        >
          <X className="h-4 w-4" />
        </button>
        <embed
          src={objectUrl}
          type="application/pdf"
          title={title}
          className="h-full min-h-0 w-full flex-1 border-0 bg-slate-700"
        />
      </div>
    </div>
  );
}
