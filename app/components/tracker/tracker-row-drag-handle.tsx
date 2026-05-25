import { GripVertical } from "lucide-react";

export function TrackerRowDragHandle({ attributes, listeners }: any) {
  return (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab p-1 text-muted-foreground/70 hover:text-foreground active:cursor-grabbing"
      tabIndex={-1}
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
