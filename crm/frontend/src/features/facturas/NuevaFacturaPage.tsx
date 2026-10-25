import { useNavigate } from "react-router-dom";
import { FacturaEditor } from "@/features/facturas/FacturaEditor";

export default function NuevaFacturaPage() {
  const navigate = useNavigate();
  return <FacturaEditor mode="create" onSaved={() => navigate("/app/facturas")} />;
}
