
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Plus, MoreHorizontal, GripVertical, Edit, Trash } from "lucide-react";
import { DndContext, DragEndEvent, closestCenter } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Swimlane {
  id: string;
  name: string;
  position: number;
  color: string;
  is_default: boolean;
  project_id: string;
}

interface SwimlanesManagerProps {
  projectId: string;
  swimlanes: Swimlane[];
  onUpdate: () => void;
}

function SortableSwimlane({ swimlane, onEdit, onDelete }: {
  swimlane: Swimlane;
  onEdit: (swimlane: Swimlane) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: swimlane.id });

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
        className="w-4 h-4 rounded-full border-2 border-border"
        style={{ backgroundColor: swimlane.color }}
      />
      
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">{swimlane.name}</span>
          {swimlane.is_default && (
            <Badge variant="secondary" className="text-xs">Default</Badge>
          )}
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="w-8 h-8">
            <MoreHorizontal className="w-4 h-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(swimlane)}>
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          {!swimlane.is_default && (
            <DropdownMenuItem 
              onClick={() => onDelete(swimlane.id)}
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

export function SwimlanesManager({ projectId, swimlanes, onUpdate }: SwimlanesManagerProps) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSwimlane, setEditingSwimlane] = useState<Swimlane | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#6b7280'
  });

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Swimlane name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingSwimlane) {
        // Update existing swimlane
        const { error } = await supabase
          .from('swimlanes')
          .update({
            name: formData.name.trim(),
            color: formData.color,
          })
          .eq('id', editingSwimlane.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Swimlane updated successfully",
        });
      } else {
        // Create new swimlane
        const maxPosition = Math.max(...swimlanes.map(s => s.position), 0);
        
        const { error } = await supabase
          .from('swimlanes')
          .insert({
            project_id: projectId,
            name: formData.name.trim(),
            color: formData.color,
            position: maxPosition + 1,
            is_default: false
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Swimlane created successfully",
        });
      }

      setIsDialogOpen(false);
      setEditingSwimlane(null);
      setFormData({ name: '', color: '#6b7280' });
      onUpdate();
    } catch (error) {
      console.error('Error saving swimlane:', error);
      toast({
        title: "Error",
        description: "Failed to save swimlane",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (swimlane: Swimlane) => {
    setEditingSwimlane(swimlane);
    setFormData({
      name: swimlane.name,
      color: swimlane.color
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (swimlaneId: string) => {
    try {
      const { error } = await supabase
        .from('swimlanes')
        .delete()
        .eq('id', swimlaneId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Swimlane deleted successfully",
      });
      onUpdate();
    } catch (error) {
      console.error('Error deleting swimlane:', error);
      toast({
        title: "Error",
        description: "Failed to delete swimlane",
        variant: "destructive",
      });
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const activeIndex = swimlanes.findIndex(s => s.id === active.id);
    const overIndex = swimlanes.findIndex(s => s.id === over.id);

    if (activeIndex === -1 || overIndex === -1) return;

    try {
      // Update positions in database
      const updates = swimlanes.map((swimlane, index) => {
        let newPosition = index + 1;
        
        if (index === activeIndex) {
          newPosition = overIndex + 1;
        } else if (activeIndex < overIndex && index > activeIndex && index <= overIndex) {
          newPosition = index;
        } else if (activeIndex > overIndex && index >= overIndex && index < activeIndex) {
          newPosition = index + 2;
        }
        
        return { id: swimlane.id, position: newPosition };
      });

      for (const update of updates) {
        await supabase
          .from('swimlanes')
          .update({ position: update.position })
          .eq('id', update.id);
      }

      onUpdate();
      
      toast({
        title: "Success",
        description: "Swimlane order updated successfully",
      });
    } catch (error) {
      console.error('Error updating swimlane positions:', error);
      toast({
        title: "Error",
        description: "Failed to update swimlane order",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Swimlanes</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="sm"
                onClick={() => {
                  setEditingSwimlane(null);
                  setFormData({ name: '', color: '#6b7280' });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Swimlane
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSwimlane ? 'Edit Swimlane' : 'Create Swimlane'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter swimlane name"
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
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    {editingSwimlane ? 'Update' : 'Create'}
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
            items={swimlanes.map(s => s.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {swimlanes.map((swimlane) => (
                <SortableSwimlane
                  key={swimlane.id}
                  swimlane={swimlane}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        
        {swimlanes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>No swimlanes configured</p>
            <p className="text-sm">Add a swimlane to organize your tasks</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
