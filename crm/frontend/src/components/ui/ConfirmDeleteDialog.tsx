import { useState } from "react";
import { btnPrimary, btnSecondary, inputClass } from "@/components/ui/SoftOneUi";

type Props = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  confirmMatch?: string;
  onClose: () => void;
  onConfirm: () => void;
  isPending?: boolean;
};

export function ConfirmDeleteDialog({
  open,
  title,
  description,
  confirmLabel = "Eliminar",
  confirmMatch,
  onClose,
  onConfirm,
  isPending,
}: Props) {
  const [typed, setTyped] = useState("");

  if (!open) return null;

  const canConfirm = !confirmMatch || typed.trim() === confirmMatch;

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} aria-hidden />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
          {confirmMatch && (
            <label className="mt-4 block text-sm text-slate-700">
              Escribe <strong>{confirmMatch}</strong> para confirmar
              <input
                className={`${inputClass} mt-1`}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoFocus
              />
            </label>
          )}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose} disabled={isPending}>
              Cancelar
            </button>
            <button
              type="button"
              className={btnPrimary + " !bg-red-600 hover:!bg-red-700"}
              disabled={!canConfirm || isPending}
              onClick={onConfirm}
            >
              {isPending ? "Eliminando…" : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
