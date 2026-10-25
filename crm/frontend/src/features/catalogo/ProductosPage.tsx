import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Package, Upload } from "lucide-react";
import { useState } from "react";
import {
  btnPrimary,
  btnSecondary,
  SoftOneAlert,
  inputClass,
  selectClass,
  SoftOneEmpty,
  SoftOneField,
  SoftOneLoading,
  SoftOnePageHeader,
  SoftOnePagination,
  SoftOneSearchBar,
  SoftOneTable,
  SoftOneTableHead,
  SoftOneToolbar,
} from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { formatApiError, paginatedParams, type Paginated } from "@/core/api/pagination";
import { useDebouncedValue } from "@/core/hooks/useDebouncedValue";
import { useListPageSize } from "@/core/hooks/useListPageSize";
import {
  categoryToPayload,
  CreatableCategorySelect,
  type CategoryValue,
} from "@/components/ui/CreatableCategorySelect";
import { ConfirmDeleteDialog } from "@/components/ui/ConfirmDeleteDialog";
import { SoftOneAccionesMenu } from "@/components/ui/SoftOneAccionesMenu";
import { SoftOneRowActions } from "@/components/ui/SoftOneRowActions";

type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  precio: string;
  precio_incluye_iva?: boolean;
  iva_porcentaje: string;
  tipo: string;
  categoria_id?: number | null;
  categoria_nombre_display?: string;
  descripcion?: string;
  is_active: boolean;
};

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
};

export default function ProductosPage() {
  const qc = useQueryClient();
  const { pageSize, setPageSize, pageSizeOptions } = useListPageSize(25);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [tipoFilter, setTipoFilter] = useState("");
  const [categoriaFilter, setCategoriaFilter] = useState<CategoryValue>({ kind: "none" });
  const debouncedSearch = useDebouncedValue(search, 300);
  const [updateExisting, setUpdateExisting] = useState(true);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [nombre, setNombre] = useState("");
  const [codigo, setCodigo] = useState("");
  const [precio, setPrecio] = useState("");
  const [tipo, setTipo] = useState("servicio");
  const [categoria, setCategoria] = useState<CategoryValue>({ kind: "none" });
  const [editProduct, setEditProduct] = useState<Producto | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Producto | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  const categoriaFilterId = categoriaFilter.kind === "id" ? categoriaFilter.id : undefined;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["productos", debouncedSearch, page, tipoFilter, categoriaFilterId, pageSize],
    queryFn: async () => {
      const { data: res } = await api.get<Paginated<Producto>>("/productos/", {
        params: paginatedParams({
          search: debouncedSearch,
          page,
          pageSize,
          extra: {
            ...(tipoFilter ? { tipo: tipoFilter } : {}),
            ...(categoriaFilterId ? { categoria: categoriaFilterId } : {}),
          },
        }),
      });
      return res;
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.post("/productos/", {
        nombre,
        codigo,
        precio,
        tipo,
        iva_porcentaje: 19,
        precio_incluye_iva: true,
        ...categoryToPayload(categoria),
      });
    },
    onSuccess: () => {
      setNombre("");
      setCodigo("");
      setPrecio("");
      setCategoria({ kind: "none" });
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  const updateProduct = useMutation({
    mutationFn: async (p: Producto & { categoria: CategoryValue }) => {
      await api.patch(`/productos/${p.id}/`, {
        nombre: p.nombre,
        codigo: p.codigo,
        precio: p.precio,
        tipo: p.tipo,
        iva_porcentaje: p.iva_porcentaje,
        precio_incluye_iva: p.precio_incluye_iva !== false,
        is_active: p.is_active,
        ...categoryToPayload(p.categoria),
      });
    },
    onSuccess: () => {
      setEditProduct(null);
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (err) => setEditError(formatApiError(err)),
  });

  const removeProduct = useMutation({
    mutationFn: (id: number) => api.delete(`/productos/${id}/`),
    onSuccess: () => {
      setDeleteProduct(null);
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
  });

  const importCsv = useMutation({
    mutationFn: async (file: File) => {
      setImportError(null);
      setImportResult(null);
      const form = new FormData();
      form.append("file", file);
      form.append("update_existing", updateExisting ? "true" : "false");
      const { data: res } = await api.post<ImportResult>("/productos/import-csv/", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      return res;
    },
    onSuccess: (res) => {
      setImportResult(res);
      setImportModalOpen(false);
      setImportFile(null);
      qc.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (err) => setImportError(formatApiError(err)),
  });

  const list = data?.results ?? [];
  const total = data?.count ?? 0;

  return (
    <div className="space-y-6">
      <SoftOnePageHeader
        title="Catálogo"
        subtitle="Productos y servicios · búsqueda y carga masiva CSV"
        icon={Package}
        actions={
          <SoftOneAccionesMenu
            disabled={importCsv.isPending}
            items={[
              {
                id: "import-csv",
                label: "Importar CSV (hasta 5000 filas)",
                icon: <Upload className="h-4 w-4 text-[#0e7490]" />,
                onClick: () => {
                  setImportError(null);
                  setImportModalOpen(true);
                },
              },
              {
                id: "template",
                label: "Descargar plantilla ejemplo",
                icon: <Download className="h-4 w-4 text-slate-600" />,
                onClick: () => {
                  const a = document.createElement("a");
                  a.href = "/productos-ejemplo.csv";
                  a.download = "productos-ejemplo.csv";
                  a.click();
                },
              },
            ]}
          />
        }
      />

      {importError && <SoftOneAlert>{importError}</SoftOneAlert>}
      {importResult && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
          <p>
            Importación: creados <strong>{importResult.created}</strong> · actualizados{" "}
            <strong>{importResult.updated}</strong> · omitidos{" "}
            <strong>{importResult.skipped}</strong>
          </p>
          {importResult.errors.length > 0 && (
            <ul className="mt-2 max-h-32 list-disc overflow-y-auto pl-5 text-red-700">
              {importResult.errors.slice(0, 20).map((e) => (
                <li key={`${e.row}-${e.message}`}>
                  Fila {e.row}: {e.message}
                </li>
              ))}
              {importResult.errors.length > 20 && (
                <li>… y {importResult.errors.length - 20} errores más</li>
              )}
            </ul>
          )}
        </div>
      )}

      {importModalOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/50"
            onClick={() => !importCsv.isPending && setImportModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl">
              <h3 className="text-lg font-semibold text-slate-800">Importar CSV</h3>
              <p className="mt-2 text-sm text-slate-600">
                Columnas: nombre, codigo, precio, tipo (producto/servicio), iva_porcentaje,
                descripcion, categoria (opcional). Máximo 5000 filas.
              </p>
              <div className="mt-4 space-y-3">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="text-sm text-slate-600"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={updateExisting}
                    onChange={(e) => setUpdateExisting(e.target.checked)}
                  />
                  Actualizar si el código ya existe
                </label>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  disabled={importCsv.isPending}
                  onClick={() => setImportModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={!importFile || importCsv.isPending}
                  onClick={() => importFile && importCsv.mutate(importFile)}
                >
                  {importCsv.isPending ? "Importando…" : "Importar"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <form
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 lg:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <SoftOneField label="Nombre">
          <input
            className={inputClass}
            placeholder="Nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
          />
        </SoftOneField>
        <SoftOneField label="Código">
          <input
            className={inputClass}
            placeholder="SKU / código"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
          />
        </SoftOneField>
        <SoftOneField label="Precio (IVA incluido)">
          <input
            className={inputClass}
            placeholder="Precio de venta"
            value={precio}
            onChange={(e) => setPrecio(e.target.value)}
            required
          />
        </SoftOneField>
        <SoftOneField label="Tipo">
          <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
            <option value="servicio">Servicio</option>
            <option value="producto">Producto</option>
          </select>
        </SoftOneField>
        <CreatableCategorySelect
          label="Categoría"
          tipo="producto"
          value={categoria}
          onChange={setCategoria}
        />
        <button type="submit" className={btnPrimary} disabled={create.isPending}>
          Agregar
        </button>
      </form>

      <SoftOneToolbar>
        <SoftOneSearchBar
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Buscar por nombre, código o descripción…"
        />
        <select
          className={`${selectClass} w-full sm:w-40`}
          value={tipoFilter}
          onChange={(e) => {
            setTipoFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Todos los tipos</option>
          <option value="producto">Producto</option>
          <option value="servicio">Servicio</option>
        </select>
        <div className="w-full sm:min-w-[200px] sm:max-w-xs">
          <CreatableCategorySelect
            tipo="producto"
            value={categoriaFilter}
            onChange={(v) => {
              setCategoriaFilter(v.kind === "new" ? { kind: "none" } : v);
              setPage(1);
            }}
            placeholder="Filtrar categoría…"
          />
        </div>
      </SoftOneToolbar>

      {isLoading ? (
        <SoftOneLoading />
      ) : list.length === 0 ? (
        <SoftOneEmpty message="No hay productos que coincidan." />
      ) : (
        <>
          <SoftOneTable>
            <SoftOneTableHead>
              <th className="px-4 py-3">Código</th>
              <th className="px-4 py-3">Nombre</th>
              <th className="px-4 py-3">Categoría</th>
              <th className="px-4 py-3">Tipo</th>
              <th className="px-4 py-3 text-right">Precio</th>
              <th className="px-4 py-3 text-right">IVA %</th>
              <th className="px-4 py-3 text-right">Acciones</th>
            </SoftOneTableHead>
            <tbody className={isFetching ? "opacity-60" : ""}>
              {list.map((p) => (
                <tr key={p.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 text-slate-600">{p.codigo || "—"}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{p.nombre}</td>
                  <td className="px-4 py-3 text-slate-600">{p.categoria_nombre_display || "—"}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">{p.tipo}</td>
                  <td className="px-4 py-3 text-right text-slate-700">
                    ${Number(p.precio).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">{p.iva_porcentaje}</td>
                  <td className="px-4 py-3">
                    <SoftOneRowActions
                      onEdit={() => {
                        setEditError(null);
                        setEditProduct(p);
                      }}
                      onDelete={() => setDeleteProduct(p)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </SoftOneTable>
          <SoftOnePagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            pageSizeOptions={pageSizeOptions}
            onPageSizeChange={(n) => {
              setPageSize(n as typeof pageSize);
              setPage(1);
            }}
          />
        </>
      )}

      {editProduct && (
        <ProductoEditModal
          product={editProduct}
          error={editError}
          onClose={() => setEditProduct(null)}
          onSave={(payload) => updateProduct.mutate(payload)}
          isPending={updateProduct.isPending}
        />
      )}

      <ConfirmDeleteDialog
        open={!!deleteProduct}
        title="Eliminar producto"
        description={deleteProduct ? `¿Eliminar «${deleteProduct.nombre}» del catálogo?` : ""}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => deleteProduct && removeProduct.mutate(deleteProduct.id)}
        isPending={removeProduct.isPending}
      />
    </div>
  );
}

function ProductoEditModal({
  product,
  error,
  onClose,
  onSave,
  isPending,
}: {
  product: Producto;
  error: string | null;
  onClose: () => void;
  onSave: (p: Producto & { categoria: CategoryValue }) => void;
  isPending: boolean;
}) {
  const [nombre, setNombre] = useState(product.nombre);
  const [codigo, setCodigo] = useState(product.codigo ?? "");
  const [precio, setPrecio] = useState(product.precio);
  const [tipo, setTipo] = useState(product.tipo);
  const [iva, setIva] = useState(product.iva_porcentaje);
  const [precioIncluyeIva, setPrecioIncluyeIva] = useState(product.precio_incluye_iva !== false);
  const [categoria, setCategoria] = useState<CategoryValue>(
    product.categoria_id
      ? { kind: "id", id: product.categoria_id, label: product.categoria_nombre_display ?? "" }
      : { kind: "none" },
  );
  const [isActive, setIsActive] = useState(product.is_active !== false);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <form
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-2xl"
          onSubmit={(e) => {
            e.preventDefault();
            onSave({
              ...product,
              nombre,
              codigo,
              precio,
              tipo,
              iva_porcentaje: iva,
              precio_incluye_iva: precioIncluyeIva,
              is_active: isActive,
              categoria,
            });
          }}
        >
          <h3 className="text-lg font-semibold">Editar producto</h3>
          {error && (
            <div className="mt-2">
              <SoftOneAlert>{error}</SoftOneAlert>
            </div>
          )}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <SoftOneField label="Nombre" className="sm:col-span-2">
              <input className={inputClass} value={nombre} onChange={(e) => setNombre(e.target.value)} required />
            </SoftOneField>
            <SoftOneField label="Código">
              <input className={inputClass} value={codigo} onChange={(e) => setCodigo(e.target.value)} />
            </SoftOneField>
            <SoftOneField label="Precio (IVA incluido)">
              <input className={inputClass} value={precio} onChange={(e) => setPrecio(e.target.value)} required />
            </SoftOneField>
            <SoftOneField label="Tipo">
              <select className={selectClass} value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="servicio">Servicio</option>
                <option value="producto">Producto</option>
              </select>
            </SoftOneField>
            <SoftOneField label="Tarifa IVA %">
              <input className={inputClass} value={iva} onChange={(e) => setIva(e.target.value)} />
            </SoftOneField>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input
                type="checkbox"
                checked={precioIncluyeIva}
                onChange={(e) => setPrecioIncluyeIva(e.target.checked)}
              />
              Precio de catalogo incluye IVA (recomendado)
            </label>
            <div className="sm:col-span-2">
              <CreatableCategorySelect tipo="producto" value={categoria} onChange={setCategoria} />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Producto activo
            </label>
          </div>
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className={btnPrimary} disabled={isPending}>
              {isPending ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
