import { Pencil, Trash2 } from "lucide-react";
import { btnLink } from "@/components/ui/SoftOneUi";

export function SoftOneRowActions({
  onEdit,
  onDelete,
  hideDelete,
}: {
  onEdit?: () => void;
  onDelete?: () => void;
  hideDelete?: boolean;
}) {
  return (
    <div className="flex justify-end gap-2">
      {onEdit && (
        <button type="button" className={btnLink + " inline-flex items-center gap-1"} onClick={onEdit}>
          <Pencil className="h-3.5 w-3.5" />
          Editar
        </button>
      )}
      {onDelete && !hideDelete && (
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:underline"
          onClick={onDelete}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      )}
    </div>
  );
}
