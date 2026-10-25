import { useNavigate } from "react-router-dom";
import { CotizacionEditor } from "@/features/cotizaciones/CotizacionEditor";

export default function NuevaCotizacionPage() {
  const navigate = useNavigate();
  return <CotizacionEditor mode="create" onSaved={() => navigate("/app/cotizaciones")} />;
}
