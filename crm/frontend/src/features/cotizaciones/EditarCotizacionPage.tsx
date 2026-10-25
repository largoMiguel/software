import { useQuery } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { SoftOneAlert, SoftOneLoading } from "@/components/ui/SoftOneUi";
import { api } from "@/core/api/client";
import { CotizacionEditor } from "@/features/cotizaciones/CotizacionEditor";
import type { CotizacionItemApi } from "@/features/cotizaciones/cotizacionFormUtils";

type CotizacionDetail = {
  id: number;
  numero: string;
  estado: string;
  cliente_id: number;
  notas: string;
  fecha_vencimiento: string | null;
  items: CotizacionItemApi[];
};

export default function EditarCotizacionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cotId = Number(id);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["cotizacion", cotId],
    enabled: Number.isFinite(cotId),
    queryFn: async () => {
      const { data: res } = await api.get<CotizacionDetail>(`/cotizaciones/${cotId}/`);
      return res;
    },
  });

  if (!Number.isFinite(cotId)) {
    return <Navigate to="/app/cotizaciones" replace />;
  }

  if (isLoading) return <SoftOneLoading label="Cargando cotización…" />;

  if (isError || !data) {
    return (
      <SoftOneAlert>No se pudo cargar la cotización.</SoftOneAlert>
    );
  }

  if (data.estado !== "borrador") {
    return (
      <SoftOneAlert variant="info">
        Solo se pueden editar cotizaciones en borrador. Estado actual: {data.estado}.
      </SoftOneAlert>
    );
  }

  return (
    <CotizacionEditor
      key={data.id}
      mode="edit"
      cotizacionId={data.id}
      numero={data.numero}
      initialClienteId={data.cliente_id}
      initialNotas={data.notas}
      initialFechaVencimiento={data.fecha_vencimiento}
      initialItems={data.items}
      onSaved={() => navigate("/app/cotizaciones")}
    />
  );
}
