import { Check, Pencil, Receipt, Send, Trash2, X } from "lucide-react";
import { Link } from "react-router-dom";
import { PdfDownloadButton } from "@/components/ui/PdfDownloadButton";
import {
  btnAction,
  btnActionDanger,
  btnActionPrimary,
  btnActionSuccess,
} from "@/components/ui/SoftOneUi";

type Props = {
  id: number;
  numero: string;
  estado: string;
  onPdfError: (msg: string) => void;
  onDelete: () => void;
  onEnviar: () => void;
  onAceptar: () => void;
  onRechazar: () => void;
  enviarPending?: boolean;
};

export function CotizacionRowActions({
  id,
  numero,
  estado,
  onPdfError,
  onDelete,
  onEnviar,
  onAceptar,
  onRechazar,
  enviarPending,
}: Props) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {estado === "borrador" && (
        <Link to={`/app/cotizaciones/${id}/editar`} className={btnAction} title="Editar borrador">
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </Link>
      )}
      <PdfDownloadButton
        path={`/cotizaciones/${id}/pdf/`}
        filename={`${numero}.pdf`}
        className={btnAction}
        onError={onPdfError}
      />
      {estado === "borrador" && (
        <>
          <button
            type="button"
            className={btnActionPrimary}
            title="Marcar como enviada al cliente"
            disabled={enviarPending}
            onClick={onEnviar}
          >
            <Send className="h-3.5 w-3.5" />
            Enviar
          </button>
          <button
            type="button"
            className={btnActionDanger}
            title="Eliminar borrador"
            onClick={onDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Eliminar
          </button>
        </>
      )}
      {estado === "enviada" && (
        <>
          <button
            type="button"
            className={btnActionSuccess}
            title="Cliente acepto la cotizacion"
            onClick={onAceptar}
          >
            <Check className="h-3.5 w-3.5" />
            Aceptar
          </button>
          <button
            type="button"
            className={btnActionDanger}
            title="Cliente rechazo la cotizacion"
            onClick={onRechazar}
          >
            <X className="h-3.5 w-3.5" />
            Rechazar
          </button>
        </>
      )}
      {estado === "aceptada" && (
        <Link
          to={`/app/facturas?desde=${id}`}
          className={btnActionPrimary}
          title="Crear factura desde esta cotizacion"
        >
          <Receipt className="h-3.5 w-3.5" />
          Facturar
        </Link>
      )}
    </div>
  );
}
