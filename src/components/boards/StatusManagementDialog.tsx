import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { statusService, type TaskStatus, type CreateStatusInput } from "@/services/boards/statusService";
import { useToast } from "@/hooks/use-toast";
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface StatusManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

function SortableStatusItem({ status, onEdit, onDelete }: { 
  status: TaskStatus; 
  onEdit: (status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: status.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-background border rounded-lg"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div
        className="w-6 h-6 rounded"
        style={{ backgroundColor: status.color }}
      />
      <div className="flex-1">
        <div className="font-medium text-sm">{status.name}</div>
        <div className="text-xs text-muted-foreground">{status.category}</div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(status)}
      >
        <span className="sr-only">Edit</span>
        ✏️
      </Button>
      {!status.is_default && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(status.id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

export function StatusManagementDialog({ open, onOpenChange, projectId }: StatusManagementDialogProps) {
  const [statuses, setStatuses] = useState<TaskStatus[]>([]);
  const [editingStatus, setEditingStatus] = useState<(Partial<CreateStatusInput> & { id?: string }) | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    if (open) {
      loadStatuses();
    }
  }, [open, projectId]);

  const loadStatuses = async () => {
    try {
      const data = await statusService.getProjectStatuses(projectId);
      setStatuses(data);
    } catch (error) {
      console.error('Error loading statuses:', error);
      toast({
        title: "Error",
        description: "Failed to load statuses",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);
      
      const newStatuses = arrayMove(statuses, oldIndex, newIndex);
      setStatuses(newStatuses);

      try {
        await statusService.reorderStatuses(projectId, newStatuses.map(s => s.id));
      } catch (error) {
        console.error('Error reordering statuses:', error);
        toast({
          title: "Error",
          description: "Failed to reorder statuses",
          variant: "destructive",
        });
        loadStatuses(); // Reload on error
      }
    }
  };

  const handleCreateOrUpdate = async () => {
    if (!editingStatus?.name || !editingStatus?.key || !editingStatus?.category) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (isCreating) {
        await statusService.createStatus({
          ...editingStatus,
          project_id: projectId,
        } as CreateStatusInput);
        toast({ title: "Status created successfully" });
      } else if (editingStatus.id) {
        await statusService.updateStatus(editingStatus.id, editingStatus as Partial<TaskStatus>);
        toast({ title: "Status updated successfully" });
      }
      
      setEditingStatus(null);
      setIsCreating(false);
      loadStatuses();
    } catch (error) {
      console.error('Error saving status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save status",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this status? This cannot be undone.')) return;

    try {
      await statusService.deleteStatus(id);
      toast({ title: "Status deleted successfully" });
      loadStatuses();
    } catch (error) {
      console.error('Error deleting status:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete status",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Manage Statuses</DialogTitle>
          <DialogDescription>
            Create and organize workflow statuses. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={statuses.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              {statuses.map((status) => (
                <SortableStatusItem
                  key={status.id}
                  status={status}
                  onEdit={setEditingStatus}
                  onDelete={handleDelete}
                />
              ))}
            </SortableContext>
          </DndContext>

          {editingStatus && (
            <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
              <h3 className="font-semibold">{isCreating ? 'Create Status' : 'Edit Status'}</h3>
              
              <div>
                <Label>Name *</Label>
                <Input
                  value={editingStatus.name || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, name: e.target.value })}
                  placeholder="e.g. In Review"
                />
              </div>

              <div>
                <Label>Key * (lowercase, no spaces)</Label>
                <Input
                  value={editingStatus.key || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                  placeholder="e.g. in_review"
                />
              </div>

              <div>
                <Label>Category *</Label>
                <Select
                  value={editingStatus.category}
                  onValueChange={(value: 'Todo' | 'InProgress' | 'Done') =>
                    setEditingStatus({ ...editingStatus, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todo">To Do</SelectItem>
                    <SelectItem value="InProgress">In Progress</SelectItem>
                    <SelectItem value="Done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={editingStatus.color || '#6b7280'}
                    onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                    className="w-20 h-10"
                  />
                  <Input
                    value={editingStatus.color || '#6b7280'}
                    onChange={(e) => setEditingStatus({ ...editingStatus, color: e.target.value })}
                    placeholder="#6b7280"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={editingStatus.description || ''}
                  onChange={(e) => setEditingStatus({ ...editingStatus, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>

              <div className="flex gap-2">
                <Button onClick={handleCreateOrUpdate}>
                  {isCreating ? 'Create' : 'Update'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingStatus(null);
                    setIsCreating(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {!editingStatus && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setEditingStatus({
                  name: '',
                  key: '',
                  category: 'Todo',
                  color: '#6b7280',
                });
                setIsCreating(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
