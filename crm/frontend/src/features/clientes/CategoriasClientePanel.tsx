import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tags } from "lucide-react";
import { useState } from "react";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { SoftOneRowActions } from "@/components/ui/SoftOneRowActions";
import { btnPrimary, btnSecondary, inputClass, SoftOneCard } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { paginatedParams, type Paginated } from "@/core/api/pagination";

type Categoria = { id: number; nombre: string };

export function CategoriasClientePanel() {
  const qc = useQueryClient();
  const [nombre, setNombre] = useState("");
  const [edit, setEdit] = useState<Categoria | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Categoria | null>(null);

  const { data } = useQuery({
    queryKey: ["categorias-cliente"],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<Categoria>>("/categorias/", {
        params: paginatedParams({ page: 1, pageSize: 100, extra: { tipo: "cliente" } }),
      });
      return res.results ?? [];
    },
  });

  const create = useMutation({
    mutationFn: () => api.post("/categorias/", { nombre, tipo: "cliente" }),
    onSuccess: () => {
      setNombre("");
      qc.invalidateQueries({ queryKey: ["categorias-cliente"] });
    },
  });

  const update = useMutation({
    mutationFn: () => api.patch(`/categorias/${edit!.id}/`, { nombre: editNombre }),
    onSuccess: () => {
      setEdit(null);
      qc.invalidateQueries({ queryKey: ["categorias-cliente"] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/categorias/${id}/`),
    onSuccess: () => {
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["categorias-cliente"] });
      qc.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const list = data ?? [];

  return (
    <>
      <SoftOneCard title="Segmentos / categorías de cliente" icon={<Tags className="h-4 w-4 text-[#3eafd4]" />}>
        <form
          className="mb-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <input
            className={`${inputClass} min-w-[180px] flex-1`}
            placeholder="Nueva categoría"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
          <button type="submit" className={btnPrimary} disabled={create.isPending}>
            Agregar
          </button>
        </form>
        {list.length === 0 ? (
          <p className="text-sm text-slate-500">Sin categorías.</p>
        ) : (
          <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {list.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="font-medium text-slate-800">{c.nombre}</span>
                <SoftOneRowActions
                  onEdit={() => {
                    setEdit(c);
                    setEditNombre(c.nombre);
                  }}
                  onDelete={() => setDeleteTarget(c)}
                />
              </li>
            ))}
          </ul>
        )}
      </SoftOneCard>

      {edit && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setEdit(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <form
              className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl"
              onSubmit={(e) => {
                e.preventDefault();
                update.mutate();
              }}
            >
              <h3 className="font-semibold text-slate-900">Editar segmento</h3>
              <input
                className={`${inputClass} mt-3`}
                value={editNombre}
                onChange={(e) => setEditNombre(e.target.value)}
                required
              />
              <div className="mt-4 flex justify-end gap-2">
                <button type="button" className={btnSecondary} onClick={() => setEdit(null)}>
                  Cancelar
                </button>
                <button type="submit" className={btnPrimary} disabled={update.isPending}>
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      <ConfirmDeleteDialog
        open={!!deleteTarget}
        title="Eliminar categoría"
        description={
          deleteTarget ? `¿Eliminar «${deleteTarget.nombre}»? Los clientes quedarán sin segmento.` : ""
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && remove.mutate(deleteTarget.id)}
        isPending={remove.isPending}
      />
    </>
  );
}
