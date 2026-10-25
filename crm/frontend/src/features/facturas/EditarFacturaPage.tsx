import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { SoftOneAlert, SoftOneLoading } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { FacturaEditor } from "@/features/facturas/FacturaEditor";
import type { CotizacionItemApi } from "@/features/cotizaciones/cotizacionFormUtils";

type FacturaDetail = {
  id: number;
  numero: string;
  estado: string;
  cliente_id: number;
  notas: string;
  fecha_vencimiento: string | null;
  items: CotizacionItemApi[];
};

export default function EditarFacturaPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const facturaId = Number(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["factura", facturaId],
    enabled: Number.isFinite(facturaId),
    queryFn: async () => {
      const { data: res } = await api.get<FacturaDetail>(`/facturas/${facturaId}/`);
      return res;
    },
  });

  if (!Number.isFinite(facturaId)) return <Navigate to="/app/facturas" replace />;
  if (isLoading) return <SoftOneLoading />;
  if (isError || !data) return <SoftOneAlert>No se pudo cargar.</SoftOneAlert>;
  if (data.estado !== "borrador") {
    return (
      <SoftOneAlert variant="info">
        Solo borradores. Estado: {data.estado}.{" "}
        <button type="button" className="underline" onClick={() => navigate(`/app/facturas/${data.id}`)}>
          Ver detalle
        </button>
      </SoftOneAlert>
    );
  }

  return (
    <FacturaEditor
      key={data.id}
      mode="edit"
      facturaId={data.id}
      numero={data.numero}
      initialClienteId={data.cliente_id}
      initialNotas={data.notas}
      initialFechaVencimiento={data.fecha_vencimiento}
      initialItems={data.items}
      onSaved={() => navigate(`/app/facturas/${data.id}`)}
    />
  );
}
