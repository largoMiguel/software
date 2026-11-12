import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { formatApiError } from "@/core/api/errors";
import { googleIntegrationApi } from "@/core/api/googleIntegration";
import { useGoogleGmailStatus } from "@/core/api/hooks/useGoogleGmail";

/** Acción rápida OAuth gmail.send (respuestas PQRS). Radicar desde Gmail usa el complemento publicado. */
export default function PqrsGmailConnectButton() {
  const { data: status, isLoading, refetch } = useGoogleGmailStatus();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const connected =
    status?.connected && !status.requires_reauthorization && !!status.google_email;

  async function handleConnect() {
    setBusy(true);
    setErr(null);
    try {
      const { authorize_url } = await googleIntegrationApi.connect();
      window.location.href = authorize_url;
    } catch (e) {
      setErr(formatApiError(e, "No se pudo conectar con Google."));
      setBusy(false);
    }
  }

  if (isLoading) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[0.3rem] border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Gmail…
      </span>
    );
  }

  if (connected) {
    return (
      <Link
        to="/configuracion/correo"
        className="inline-flex max-w-[220px] items-center gap-1.5 rounded-[0.3rem] border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
        title="Gmail conectado para enviar respuestas"
      >
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{status.google_email}</span>
      </Link>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleConnect()}
        className="inline-flex items-center gap-2 rounded-[0.3rem] border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Mail className="h-3.5 w-3.5 text-[#3eafd4]" />
        )}
        {status?.requires_reauthorization ? "Reconectar Google" : "Conectar Google"}
      </button>
      {err && (
        <p className="max-w-xs text-right text-[0.65rem] text-red-600" role="alert">
          {err}
        </p>
      )}
      <button
        type="button"
        className="text-[0.65rem] text-slate-500 underline hover:text-slate-700"
        onClick={() => void refetch()}
      >
        Actualizar estado
      </button>
    </div>
  );
}
