import { useEffect, useRef, useState } from "react";
import { CloudUpload, File as FileIcon, XCircle } from "lucide-react";
import {
  CANAL_OPTIONS,
  MAX_ARCHIVOS_CORRESPONDENCIA,
  MAX_FILE_SIZE_MB_CORR,
  SLA_OPTIONS,
  TIPOLOGIA_OPTIONS,
  correspondenciaApi,
  type CorrespondenciaDetail,
  type CorrespondenciaWritePayload,
} from "@/core/api/correspondencia";
import { secretariasApi, type Secretaria } from "@/core/api/entities";
import { formatApiError } from "@/core/api/errors";
import { useAuthStore } from "@/core/auth/store";

function detailToPayload(item: CorrespondenciaDetail): CorrespondenciaWritePayload {
  return {
    sentido: item.sentido,
    tipologia: item.tipologia,
    remitente_nombre: item.remitente_nombre,
    remitente_documento: item.remitente_documento || "",
    remitente_dependencia: item.remitente_dependencia || "",
    destinatario_nombre: item.destinatario_nombre,
    destinatario_documento: item.destinatario_documento || "",
    destinatario_dependencia: item.destinatario_dependencia || "",
    canal: item.canal,
    contacto_email: item.contacto_email || "",
    contacto_direccion: item.contacto_direccion || "",
    asunto: item.asunto,
    descripcion: item.descripcion || "",
    numero_folios: item.numero_folios,
    secretaria_id: item.secretaria,
    dias_habiles_respuesta: item.dias_habiles_respuesta,
  };
}

export default function CorrespondenciaFormModal({
  defaultSentido,
  edit,
  onClose,
  onCreated,
  onSaved,
}: {
  defaultSentido: "entrada" | "salida";
  edit?: CorrespondenciaDetail | null;
  onClose: () => void;
  onCreated?: (id: number) => void;
  onSaved?: (item: CorrespondenciaDetail) => void;
}) {
  const isEdit = Boolean(edit);
  const user = useAuthStore((s) => s.user);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<CorrespondenciaWritePayload>(() =>
    edit
      ? detailToPayload(edit)
      : {
          sentido: defaultSentido,
          tipologia: "oficio",
          remitente_nombre: "",
          destinatario_nombre: "",
          canal: "digital",
          asunto: "",
          descripcion: "",
          numero_folios: 1,
          secretaria_id: user?.secretaria?.id || 0,
          dias_habiles_respuesta: 15,
          contacto_email: "",
          contacto_direccion: "",
        },
  );

  useEffect(() => {
    if (edit) setForm(detailToPayload(edit));
  }, [edit?.id]);

  useEffect(() => {
    const entityId = user?.entity?.id;
    if (!entityId) return;
    secretariasApi.list(entityId).then((list) => {
      setSecretarias(list.filter((s) => s.is_active !== false));
      if (!isEdit && !form.secretaria_id && list.length) {
        const preferred =
          user?.secretaria?.id && list.find((s) => s.id === user.secretaria?.id)
            ? user.secretaria.id
            : list[0].id;
        setForm((f) => ({ ...f, secretaria_id: preferred }));
      }
    });
  }, [user?.entity?.id]);

  function set<K extends keyof CorrespondenciaWritePayload>(
    key: K,
    value: CorrespondenciaWritePayload[K],
  ) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function handleFiles(list: FileList | null) {
    if (!list?.length) return;
    const maxBytes = MAX_FILE_SIZE_MB_CORR * 1024 * 1024;
    const valid: File[] = [];
    let skippedOversized = 0;
    for (const f of Array.from(list)) {
      if (f.size > maxBytes) {
        skippedOversized++;
        continue;
      }
      valid.push(f);
    }
    setArchivos((prev) => {
      const merged = [...prev, ...valid].slice(0, MAX_ARCHIVOS_CORRESPONDENCIA);
      if (skippedOversized > 0) {
        setError(
          `${skippedOversized} archivo(s) superan ${MAX_FILE_SIZE_MB_CORR} MB y no se agregaron.`,
        );
      } else if (merged.length < prev.length + valid.length) {
        setError(`Máximo ${MAX_ARCHIVOS_CORRESPONDENCIA} archivos permitidos.`);
      }
      return merged;
    });
  }

  function removeFile(index: number) {
    setArchivos((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadExtraAnexos(correspondenciaId: number, sentido: "entrada" | "salida") {
    const tipo = sentido === "salida" ? "respuesta" : "solicitud";
    for (const file of archivos) {
      await correspondenciaApi.uploadAnexo(correspondenciaId, file, tipo);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (isEdit && edit) {
        let updated = await correspondenciaApi.update(edit.id, form);
        if (archivos.length > 0) {
          await uploadExtraAnexos(edit.id, updated.sentido);
          updated = await correspondenciaApi.get(edit.id);
        }
        onSaved?.(updated);
      } else {
        const created =
          archivos.length > 0
            ? await correspondenciaApi.createWithFiles(form, archivos)
            : await correspondenciaApi.create(form);
        onCreated?.(created.id);
      }
    } catch (err) {
      setError(formatApiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-10">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[#111827]">
              {isEdit ? "Editar radicado" : "Radicar correspondencia"}
            </h2>
            {isEdit && edit && (
              <p className="mt-0.5 font-mono text-xs text-slate-500">{edit.numero_radicado}</p>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            ✕
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4 px-5 py-4">
          {error && (
            <div className="rounded-[0.3rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Sentido</span>
              <select
                value={form.sentido}
                onChange={(e) => set("sentido", e.target.value as "entrada" | "salida")}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              >
                <option value="entrada">Entrada</option>
                <option value="salida">Salida</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Tipología</span>
              <select
                value={form.tipologia}
                onChange={(e) => set("tipologia", e.target.value)}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              >
                {TIPOLOGIA_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Canal</span>
              <select
                value={form.canal}
                onChange={(e) => set("canal", e.target.value)}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              >
                {CANAL_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">SLA (días hábiles)</span>
              <select
                value={form.dias_habiles_respuesta}
                onChange={(e) => set("dias_habiles_respuesta", Number(e.target.value))}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              >
                {SLA_OPTIONS.map((d) => (
                  <option key={d} value={d}>
                    {d} días
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Secretaría</span>
            <select
              value={form.secretaria_id || ""}
              onChange={(e) => set("secretaria_id", Number(e.target.value))}
              required
              className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
            >
              <option value="" disabled>
                Seleccionar…
              </option>
              {secretarias.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Remitente</span>
              <input
                required
                value={form.remitente_nombre}
                onChange={(e) => set("remitente_nombre", e.target.value)}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-slate-600">Destinatario</span>
              <input
                required
                value={form.destinatario_nombre}
                onChange={(e) => set("destinatario_nombre", e.target.value)}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              />
            </label>
          </div>

          {form.canal === "correo" && (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Correo de contacto</span>
              <input
                type="email"
                required
                value={form.contacto_email || ""}
                onChange={(e) => set("contacto_email", e.target.value)}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              />
            </label>
          )}
          {form.canal === "fisico" && (
            <label className="block text-sm">
              <span className="mb-1 block text-slate-600">Dirección</span>
              <input
                required
                value={form.contacto_direccion || ""}
                onChange={(e) => set("contacto_direccion", e.target.value)}
                className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Asunto</span>
            <input
              required
              value={form.asunto}
              onChange={(e) => set("asunto", e.target.value)}
              className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">Descripción</span>
            <textarea
              rows={3}
              value={form.descripcion || ""}
              onChange={(e) => set("descripcion", e.target.value)}
              className="w-full rounded-[0.3rem] border border-slate-300 px-3 py-2"
            />
          </label>

          <div className="text-sm">
            <span className="mb-2 block text-slate-600">
              {isEdit ? "Agregar documentos" : "Documentos adjuntos"}{" "}
              <span className="font-normal text-slate-400">
                (máx {MAX_ARCHIVOS_CORRESPONDENCIA} archivos · {MAX_FILE_SIZE_MB_CORR} MB c/u · PDF, imágenes,
                Office
                {isEdit ? " · los existentes se gestionan en el detalle" : ""})
              </span>
            </span>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                handleFiles(e.dataTransfer.files);
              }}
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-all ${
                dragOver ? "border-[#3eafd4]/60 bg-[#3eafd4]/5" : "border-slate-200 bg-slate-50 hover:border-slate-300"
              }`}
            >
              <CloudUpload className="mx-auto mb-1 h-7 w-7 text-slate-300" />
              <div className="text-slate-500">Arrastra y suelta tus archivos aquí</div>
              <div className="text-xs text-slate-400">o</div>
              <span className="mt-1 inline-block text-sm font-medium text-[#0e7490]">Seleccionar archivos</span>
              <input
                ref={fileRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => handleFiles(e.target.files)}
              />
            </div>
            {archivos.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1.5">
                {archivos.map((f, i) => (
                  <li
                    key={`${f.name}-${i}`}
                    className="flex items-center gap-2 rounded-lg border border-slate-100 bg-white px-3 py-2"
                  >
                    <FileIcon className="h-4 w-4 flex-shrink-0 text-slate-400" />
                    <span className="flex-1 truncate text-slate-700">{f.name}</span>
                    <span className="text-xs text-slate-400">{formatSize(f.size)}</span>
                    <button
                      type="button"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        removeFile(i);
                      }}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-[0.3rem] border border-slate-200 px-4 py-2 text-sm text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-[0.3rem] bg-[#3eafd4] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? "Guardando…" : isEdit ? "Guardar cambios" : "Radicar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
