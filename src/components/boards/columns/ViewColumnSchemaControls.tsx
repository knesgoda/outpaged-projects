import { useMemo } from "react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { GripVertical, Eye, EyeOff } from "lucide-react";
import type { ViewColumnPreferences } from "@/types/boards";

interface ViewColumnSchemaControlsProps {
  columns: string[];
  preferences: ViewColumnPreferences;
  onChange: (next: ViewColumnPreferences) => void;
  onSave: () => void;
  onReset: () => void;
  saving?: boolean;
}

interface SortableColumnProps {
  id: string;
  hidden: boolean;
  onToggle: (id: string, hidden: boolean) => void;
}

function SortableColumn({ id, hidden, onToggle }: SortableColumnProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center justify-between rounded-lg border bg-card px-3 py-2 text-sm ${
        isDragging ? "shadow-lg ring-2 ring-primary/40" : ""
      }`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="cursor-grab text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="flex flex-col">
          <span className="font-medium">{id}</span>
          <span className="text-xs text-muted-foreground">
            Drag to reorder or toggle visibility per view
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={hidden ? "outline" : "secondary"} className="text-[10px] uppercase">
          {hidden ? "Hidden" : "Visible"}
        </Badge>
        <Switch
          checked={!hidden}
          onCheckedChange={(checked) => onToggle(id, !checked)}
          aria-label={`Toggle visibility for ${id}`}
        />
      </div>
    </div>
  );
}

const mergeOrder = (columns: string[], preferences: ViewColumnPreferences) => {
  const unique = new Set<string>();
  const ordered: string[] = [];

  const apply = (list: string[]) => {
    for (const item of list) {
      if (item && !unique.has(item)) {
        unique.add(item);
        ordered.push(item);
      }
    }
  };

  if (preferences.order.length > 0) {
    apply(preferences.order);
  }
  apply(columns);

  return ordered;
};

export function ViewColumnSchemaControls({
  columns,
  preferences,
  onChange,
  onSave,
  onReset,
  saving,
}: ViewColumnSchemaControlsProps) {
  const orderedColumns = useMemo(
    () => mergeOrder(columns, preferences),
    [columns, preferences]
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = orderedColumns.findIndex((column) => column === active.id);
    const newIndex = orderedColumns.findIndex((column) => column === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    const nextOrder = [...orderedColumns];
    const [moved] = nextOrder.splice(oldIndex, 1);
    nextOrder.splice(newIndex, 0, moved);

    onChange({
      ...preferences,
      order: nextOrder,
    });
  };

  const handleToggle = (id: string, hidden: boolean) => {
    const nextHidden = hidden
      ? Array.from(new Set([...preferences.hidden, id]))
      : preferences.hidden.filter((column) => column !== id);

    onChange({
      ...preferences,
      hidden: nextHidden,
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex flex-col gap-1">
          <Label className="text-sm font-semibold">Visible columns</Label>
          <p className="text-xs text-muted-foreground">
            Column visibility preferences are stored with this saved view and do
            not alter the underlying board schema.
          </p>
        </div>
      </div>

      <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedColumns} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {orderedColumns.map((column) => (
              <SortableColumn
                key={column}
                id={column}
                hidden={preferences.hidden.includes(column)}
                onToggle={handleToggle}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={onReset}>
          <Eye className="mr-2 h-3.5 w-3.5" />
          Reset
        </Button>
        <Button type="button" onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : (
            <span className="flex items-center gap-2">
              <EyeOff className="h-3.5 w-3.5" />
              Save preferences
            </span>
          )}
        </Button>
      </div>
    </div>
  );
}
