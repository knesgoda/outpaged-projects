
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, GripVertical, Edit, Trash, Settings } from "lucide-react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ConnectColumnConfigurator,
  ConnectColumnRenderer,
  DependencyColumnConfigurator,
  DependencyColumnRenderer,
  FormulaColumnConfigurator,
  FormulaColumnRenderer,
  MirrorColumnConfigurator,
  MirrorColumnRenderer,
  RollupColumnConfigurator,
  RollupColumnRenderer,
} from "@/components/boards/columns";
import {
  type KanbanColumnType,
  type ColumnMetadataValue,
  type DependencyColumnMetadata,
  type FormulaColumnMetadata,
  type RollupColumnMetadata,
  type MirrorColumnMetadata,
  type ConnectColumnMetadata,
  getDefaultMetadata,
  isAdvancedColumnType,
} from "@/types/boardColumns";

interface KanbanColumnData {
  id: string;
  name: string;
  position: number;
  color: string;
  wip_limit?: number;
  is_default: boolean;
  project_id: string;
  column_type: KanbanColumnType;
  metadata: Record<string, unknown> | null;
}

interface ColumnManagerProps {
  projectId: string;
  columns: KanbanColumnData[];
  onUpdate: () => void;
}

const COLUMN_TYPE_LABELS: Record<KanbanColumnType, string> = {
  status: "Status",
  assignee: "Assignee",
  dependency: "Dependency",
  formula: "Formula",
  rollup: "Rollup",
  mirror: "Mirror",
  connect: "Connect",
};

const DEPENDENCY_SAMPLE = [
  { id: "task-1", title: "Design dependency", status: "in_review", blocked: false },
  { id: "task-2", title: "API contract", status: "blocked", blocked: true },
];

const ROLLUP_SAMPLE = [
  { completed: 1 },
  { completed: 0 },
  { completed: 1 },
  { completed: 1 },
];

const MIRROR_SAMPLE = {
  status: "In progress",
  assignee: "Jordan",
  due_date: "2024-12-01",
};

const CONNECT_SAMPLE = [
  { id: "PR-101", title: "Review PR" },
  { id: "DOC-17", title: "Architecture" },
];

const FORMULA_SAMPLE = {
  completed: 6,
  total: 8,
  story_points: 21,
};

type MetadataState = ColumnMetadataValue;

type ColumnFormState = {
  name: string;
  color: string;
  wip_limit: string;
  column_type: KanbanColumnType;
  metadata: MetadataState;
};

function normalizeMetadata(
  type: KanbanColumnType,
  metadata: unknown
): MetadataState {
  if (!isAdvancedColumnType(type)) {
    return {};
  }

  const base = getDefaultMetadata(type);
  if (metadata && typeof metadata === "object") {
    return { ...base, ...(metadata as Record<string, unknown>) } as MetadataState;
  }
  return base;
}

const serializeMetadata = (
  type: KanbanColumnType,
  metadata: MetadataState
): Record<string, unknown> => {
  if (!isAdvancedColumnType(type)) {
    return {};
  }
  return metadata as Record<string, unknown>;
};

function SortableColumn({ column, onEdit, onDelete }: {
  column: KanbanColumnData;
  onEdit: (column: KanbanColumnData) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: column.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 p-3 border rounded-lg bg-card ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-4 h-4 text-muted-foreground" />
      </div>
      
      <div
        className="w-4 h-4 rounded border-2 border-border"
        style={{ backgroundColor: column.color }}
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{column.name}</span>
          {column.is_default && (
            <Badge variant="secondary" className="text-xs">Default</Badge>
          )}
          {column.wip_limit && (
            <Badge variant="outline" className="text-xs">
              WIP: {column.wip_limit}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{COLUMN_TYPE_LABELS[column.column_type]}</span>
          {isAdvancedColumnType(column.column_type) ? (
            <Badge variant="outline" className="text-[10px] uppercase">
              Advanced
            </Badge>
          ) : null}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(column)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          {!column.is_default && (
            <DropdownMenuItem 
              onClick={() => onDelete(column.id)}
              className="text-destructive"
            >
              <Trash className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ColumnManager({ projectId, columns, onUpdate }: ColumnManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<KanbanColumnData | null>(null);
  const [formData, setFormData] = useState<ColumnFormState>({
    name: "",
    color: "#6b7280",
    wip_limit: "",
    column_type: "status" as KanbanColumnType,
    metadata: getDefaultMetadata("status"),
  });
  const handleMetadataChange = (metadata: MetadataState) => {
    setFormData((prev) => ({ ...prev, metadata }));
  };
  const handleColumnTypeChange = (nextType: KanbanColumnType) => {
    setFormData((prev) => ({
      ...prev,
      column_type: nextType,
      metadata: getDefaultMetadata(nextType),
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Column name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingColumn) {
        // Update existing column
        const { error } = await supabase
          .from('kanban_columns')
          .update({
            name: formData.name.trim(),
            color: formData.color,
            wip_limit: formData.wip_limit ? parseInt(formData.wip_limit) : null,
            column_type: formData.column_type,
            metadata: serializeMetadata(formData.column_type, formData.metadata),
          })
          .eq('id', editingColumn.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Column updated successfully",
        });
      } else {
        // Create new column
        const maxPosition = Math.max(...columns.map(c => c.position), 0);
        
        const { error } = await supabase
          .from('kanban_columns')
          .insert({
            project_id: projectId,
            name: formData.name.trim(),
            color: formData.color,
            position: maxPosition + 1,
            wip_limit: formData.wip_limit ? parseInt(formData.wip_limit) : null,
            is_default: false,
            column_type: formData.column_type,
            metadata: serializeMetadata(formData.column_type, formData.metadata),
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Column created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingColumn(null);
      setFormData({
        name: "",
        color: "#6b7280",
        wip_limit: "",
        column_type: "status",
        metadata: getDefaultMetadata("status"),
      });
      onUpdate();
    } catch (error) {
      console.error('Error saving column:', error);
      toast({
        title: "Error",
        description: "Failed to save column",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (column: KanbanColumnData) => {
    setEditingColumn(column);
    setFormData({
      name: column.name,
      color: column.color ?? "#6b7280",
      wip_limit: column.wip_limit?.toString() || "",
      column_type: column.column_type,
      metadata: normalizeMetadata(column.column_type, column.metadata ?? {}),
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('kanban_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Column deleted successfully",
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Error",
        description: "Failed to delete column",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = columns.findIndex(c => c.id === active.id);
    const overIndex = columns.findIndex(c => c.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    try {
      // Update positions in database
      const updates = columns.map((column, index) => {
        let newPosition = index + 1;
        
        if (index === activeIndex) {
          newPosition = overIndex + 1;
        } else if (activeIndex < overIndex && index > activeIndex && index <= overIndex) {
          newPosition = index;
        } else if (activeIndex > overIndex && index >= overIndex && index < activeIndex) {
          newPosition = index + 2;
        }
        
        return { id: column.id, position: newPosition };
      });

      for (const update of updates) {
        await supabase
          .from('kanban_columns')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      onUpdate();
      
      toast({
        title: "Success",
        description: "Column order updated successfully",
      });
    } catch (error) {
      console.error('Error updating column positions:', error);
      toast({
        title: "Error",
        description: "Failed to update column order",
        variant: "destructive",
      });
    }
  };

  const configurator = useMemo(() => {
    switch (formData.column_type) {
      case "dependency":
        return (
          <DependencyColumnConfigurator
            metadata={formData.metadata as DependencyColumnMetadata}
            onChange={(metadata) => handleMetadataChange(metadata)}
          />
        );
      case "formula":
        return (
          <FormulaColumnConfigurator
            metadata={formData.metadata as FormulaColumnMetadata}
            onChange={(metadata) => handleMetadataChange(metadata)}
          />
        );
      case "rollup":
        return (
          <RollupColumnConfigurator
            metadata={formData.metadata as RollupColumnMetadata}
            onChange={(metadata) => handleMetadataChange(metadata)}
          />
        );
      case "mirror":
        return (
          <MirrorColumnConfigurator
            metadata={formData.metadata as MirrorColumnMetadata}
            onChange={(metadata) => handleMetadataChange(metadata)}
          />
        );
      case "connect":
        return (
          <ConnectColumnConfigurator
            metadata={formData.metadata as ConnectColumnMetadata}
            onChange={(metadata) => handleMetadataChange(metadata)}
          />
        );
      default:
        return null;
    }
  }, [formData.column_type, formData.metadata]);

  const preview = useMemo(() => {
    switch (formData.column_type) {
      case "dependency":
        return (
          <DependencyColumnRenderer
            value={DEPENDENCY_SAMPLE}
            metadata={formData.metadata as DependencyColumnMetadata}
          />
        );
      case "formula":
        return (
          <FormulaColumnRenderer
            value={FORMULA_SAMPLE}
            metadata={formData.metadata as FormulaColumnMetadata}
          />
        );
      case "rollup":
        return (
          <RollupColumnRenderer
            value={ROLLUP_SAMPLE}
            metadata={formData.metadata as RollupColumnMetadata}
          />
        );
      case "mirror":
        return (
          <MirrorColumnRenderer
            value={MIRROR_SAMPLE}
            metadata={formData.metadata as MirrorColumnMetadata}
          />
        );
      case "connect":
        return (
          <ConnectColumnRenderer
            value={CONNECT_SAMPLE}
            metadata={formData.metadata as ConnectColumnMetadata}
          />
        );
      default:
        return (
          <p className="text-xs text-muted-foreground">
            Preview is not required for this column type.
          </p>
        );
    }
  }, [formData.column_type, formData.metadata]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Board Columns</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="sm"
                onClick={() => {
                  setEditingColumn(null);
                  setFormData({
                    name: "",
                    color: "#6b7280",
                    wip_limit: "",
                    column_type: "status",
                    metadata: getDefaultMetadata("status"),
                  });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Column
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingColumn ? 'Edit Column' : 'Create Column'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter column name"
                  />
                </div>
                <div>
                  <Label htmlFor="color">Color</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="color"
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      className="w-16 h-10"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
                      placeholder="#6b7280"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="wip_limit">WIP Limit (optional)</Label>
                  <Input
                    id="wip_limit"
                    type="number"
                    value={formData.wip_limit}
                    onChange={(e) => setFormData(prev => ({ ...prev, wip_limit: e.target.value }))}
                    placeholder="e.g. 5"
                    min="1"
                  />
                </div>
                <div>
                  <Label htmlFor="column-type">Column type</Label>
                  <Select
                    value={formData.column_type}
                    onValueChange={(value) =>
                      handleColumnTypeChange(value as KanbanColumnType)
                    }
                  >
                    <SelectTrigger id="column-type">
                      <SelectValue placeholder="Select a column type" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(COLUMN_TYPE_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    Advanced column types unlock richer automation, visualization,
                    and rollups without altering the underlying board schema.
                  </p>
                </div>
                {configurator && (
                  <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
                    <h3 className="text-sm font-semibold">Type configuration</h3>
                    {configurator}
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Live preview</Label>
                  <div className="rounded-lg border bg-background p-4 text-sm">
                    {preview}
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingColumn ? 'Update' : 'Create'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={columns.map(c => c.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {columns.map((column) => (
                <SortableColumn
                  key={column.id}
                  column={column}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {columns.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No columns configured</p>
            <p className="text-sm">Add columns to organize your workflow</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
