import { GripVertical } from "lucide-react";

export function TrackerRowDragHandle({ attributes, listeners }: any) {
  return (
    <button
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      tabIndex={-1}
      aria-label="Drag to reorder"
    >
      <GripVertical className="h-4 w-4" />
    </button>
  );
}
