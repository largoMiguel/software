import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings, UserPlus } from "lucide-react";
import { useRef, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import {
  btnLink,
  btnPrimary,
  btnSecondary,
  inputClass,
  selectClass,
  SoftOneAlert,
  SoftOneCard,
  SoftOneField,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOneTable,
  SoftOneTableHead,
} from "@/components/ui/SoftOneUi";
import { useAuthStore } from "@/core/auth/store";
import { ROL_DESCRIPTIONS, ROL_LABELS } from "@/core/navigation/crmNav";
import { api } from "@/core/api/client";
import { formatApiError } from "@/core/api/pagination";

type Empresa = {
  nombre: string;
  nit: string;
  email: string;
  telefono: string;
  direccion: string;
  prefijo_cotizacion: string;
  prefijo_factura: string;
  logo_url: string;
};

type Membresia = {
  id: number;
  user_email: string;
  user_name: string;
  rol: string;
};

const FIELD_LABELS: Record<keyof Omit<Empresa, "logo_url">, string> = {
  nombre: "Nombre",
  nit: "NIT",
  email: "Email",
  telefono: "Teléfono",
  direccion: "Dirección",
  prefijo_cotizacion: "Prefijo cotización",
  prefijo_factura: "Prefijo factura",
};

export default function EmpresaConfigPage() {
  const isPlatformAdmin = useAuthStore((s) => s.user?.is_platform_admin);
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["empresa-config"],
    queryFn: async () => {
      const { data: res } = await api.get<Empresa>("/empresa/config/");
      return res;
    },
  });

  const [form, setForm] = useState<Partial<Empresa>>({});
  const merged = { ...data, ...form };

  const save = useMutation({
    mutationFn: async () => {
      await api.patch("/empresa/config/", merged);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["empresa-config"] }),
  });

  const uploadLogo = useMutation({
    mutationFn: async (file: File) => {
      const body = new FormData();
      body.append("file", file);
      await api.post("/empresa/config/logo/", body, {
        headers: { "Content-Type": "multipart/form-data" },
      });
    },
    onSuccess: () => {
      setLogoError(null);
      qc.invalidateQueries({ queryKey: ["empresa-config"] });
    },
    onError: (err) => setLogoError(formatApiError(err)),
  });

  if (isLoading || !data) return <SoftOneLoading />;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title="Configuración de empresa"
        subtitle="Datos fiscales, prefijos, logo e invitaciones"
        icon={Settings}
      />

      {isPlatformAdmin && (
        <SoftOneAlert variant="info">
          Estás en modo <strong>plataforma SoftOne</strong>: puedes ajustar esta empresa cliente, pero tu cuenta no
          forma parte de su equipo ni aparece como miembro.
        </SoftOneAlert>
      )}

      <SoftOneCard title="Datos de la empresa" className="max-w-2xl">
        <div className="mb-4 flex flex-wrap items-center gap-4">
          {merged.logo_url ? (
            <img src={merged.logo_url} alt="Logo" className="h-16 max-w-[160px] object-contain" />
          ) : (
            <div className="flex h-16 w-28 items-center justify-center rounded border border-dashed border-slate-200 text-xs text-slate-400">
              Sin logo
            </div>
          )}
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo.mutate(f);
                e.target.value = "";
              }}
            />
            <button type="button" className={btnSecondary} onClick={() => fileRef.current?.click()} disabled={uploadLogo.isPending}>
              {uploadLogo.isPending ? "Subiendo…" : "Subir logo (B2)"}
            </button>
            <SoftOneField label="URL del logo (alternativa)" className="mt-2">
              <input
                className={inputClass}
                value={merged.logo_url ?? ""}
                onChange={(e) => setForm({ ...form, logo_url: e.target.value })}
                placeholder="https://…"
              />
            </SoftOneField>
            {logoError && (
              <div className="mt-2">
                <SoftOneAlert>{logoError}</SoftOneAlert>
              </div>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(Object.keys(FIELD_LABELS) as (keyof typeof FIELD_LABELS)[]).map((field) => (
            <SoftOneField key={field} label={FIELD_LABELS[field]} className={field === "direccion" ? "sm:col-span-2" : ""}>
              <input
                className={inputClass}
                value={merged[field] ?? ""}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              />
            </SoftOneField>
          ))}
        </div>
        <div className="mt-5 flex justify-end">
          <button type="button" className={btnPrimary} onClick={() => save.mutate()} disabled={save.isPending}>
            Guardar cambios
          </button>
        </div>
      </SoftOneCard>

      <InvitarMiembroSection />
    </div>
  );
}

function InvitarMiembroSection() {
  const qc = useQueryClient();
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [rol, setRol] = useState("vendedor");
  const [removeId, setRemoveId] = useState<number | null>(null);

  const { data: membresias, isLoading } = useQuery({
    queryKey: ["membresias"],
    queryFn: async () => {
      const { data: res } = await api.get<{ results: Membresia[] }>("/membresias/");
      return (res.results ?? res) as Membresia[];
    },
  });

  const invite = useMutation({
    mutationFn: async () => {
      await api.post("/membresias/", { email, full_name: fullName, rol });
    },
    onSuccess: () => {
      setEmail("");
      setFullName("");
      qc.invalidateQueries({ queryKey: ["membresias"] });
    },
  });

  const changeRol = useMutation({
    mutationFn: async ({ id, rol: newRol }: { id: number; rol: string }) => {
      await api.patch(`/membresias/${id}/rol/`, { rol: newRol });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["membresias"] }),
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/membresias/${id}/`),
    onSuccess: () => {
      setRemoveId(null);
      qc.invalidateQueries({ queryKey: ["membresias"] });
    },
  });

  const list = Array.isArray(membresias) ? membresias : [];

  return (
    <SoftOneCard
      title="Miembros del equipo"
      icon={<UserPlus className="h-4 w-4 text-[#3eafd4]" />}
    >
      <p className="mb-4 text-sm text-slate-600">
        Solo usuarios del cliente. Las cuentas de administración de plataforma SoftOne no pueden invitarse aquí.
      </p>
      <form
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          invite.mutate();
        }}
      >
        <input
          className={inputClass}
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={inputClass}
          placeholder="Nombre"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
        <select className={selectClass} value={rol} onChange={(e) => setRol(e.target.value)} aria-describedby="rol-invite-help">
          <option value="vendedor">{ROL_LABELS.vendedor}</option>
          <option value="admin">{ROL_LABELS.admin}</option>
          <option value="owner">{ROL_LABELS.owner}</option>
        </select>
        <button type="submit" className={btnPrimary} disabled={invite.isPending || !email}>
          Invitar
        </button>
      </form>
      <p id="rol-invite-help" className="-mt-4 mb-6 text-xs text-slate-500">
        {ROL_DESCRIPTIONS[rol] ?? ""}
      </p>

      {isLoading ? (
        <SoftOneLoading label="Cargando miembros…" />
      ) : (
        <SoftOneTable>
          <SoftOneTableHead>
            <th className="px-4 py-3">Usuario</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">Rol</th>
            <th className="px-4 py-3 text-right">Acciones</th>
          </SoftOneTableHead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{m.user_name || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{m.user_email}</td>
                <td className="px-4 py-3">
                  <select
                    className={`${selectClass} !py-1 text-sm`}
                    value={m.rol}
                    title={ROL_DESCRIPTIONS[m.rol]}
                    onChange={(e) => changeRol.mutate({ id: m.id, rol: e.target.value })}
                    disabled={changeRol.isPending}
                  >
                    <option value="vendedor">{ROL_LABELS.vendedor}</option>
                    <option value="admin">{ROL_LABELS.admin}</option>
                    <option value="owner">{ROL_LABELS.owner}</option>
                  </select>
                </td>
                <td className="px-4 py-3 text-right">
                  <button type="button" className={btnLink + " text-red-600"} onClick={() => setRemoveId(m.id)}>
                    Quitar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </SoftOneTable>
      )}

      <ConfirmDeleteDialog
        open={removeId != null}
        title="Quitar miembro"
        description="El usuario perderá acceso a esta empresa."
        onClose={() => setRemoveId(null)}
        onConfirm={() => removeId != null && remove.mutate(removeId)}
        isPending={remove.isPending}
      />
    </SoftOneCard>
  );
}
