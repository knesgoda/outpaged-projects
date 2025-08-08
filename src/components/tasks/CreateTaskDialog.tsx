
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartTaskTypeSelector, SMART_TASK_TYPE_OPTIONS } from "./SmartTaskTypeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface CreateTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onTaskCreated: () => void;
}

export function CreateTaskDialog({ open, onOpenChange, projectId, onTaskCreated }: CreateTaskDialogProps) {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    status: "todo",
    smartTaskType: "task"
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Don't render dialog if user is not authenticated
  if (!user) {
    return null;
  }

  const getNextTicketNumber = async () => {
    console.log("Fetching next ticket number for project:", projectId);
    const { data, error } = await supabase.rpc('get_next_ticket_number', { project_id_param: projectId });
    if (error) {
      console.warn("Failed to prefetch next ticket number, trigger should handle it:", error);
      return null;
    }
    console.log("Next ticket number:", data);
    return data as number | null;
  };

  const insertTask = async (ticketNumber?: number | null) => {
    // Get the selected smart task type option
    const selectedOption = SMART_TASK_TYPE_OPTIONS.find(option => option.id === formData.smartTaskType);
    if (!selectedOption) {
      throw new Error("Invalid task type selected");
    }

    console.log("Inserting task:", {
      title: formData.title,
      projectId,
      status: formData.status,
      priority: formData.priority,
      ticketNumber
    });

    return await supabase
      .from('tasks')
      .insert({
        title: formData.title,
        description: formData.description,
        priority: formData.priority as 'low' | 'medium' | 'high' | 'urgent',
        status: formData.status as 'todo' | 'in_progress' | 'in_review' | 'done',
        hierarchy_level: selectedOption.hierarchy_level,
        task_type: selectedOption.task_type,
        project_id: projectId,
        reporter_id: user!.id,
        // Only include ticket_number if we fetched one; otherwise let the trigger assign it
        ...(ticketNumber ? { ticket_number: ticketNumber } : {})
      })
      .select()
      .single();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create tasks",
        variant: "destructive",
      });
      return;
    }

    console.log('Creating task with:', {
      user: user.id,
      projectId,
      formData
    });

    setLoading(true);
    try {
      // Prefetch the next ticket number to avoid 23505 conflicts
      const nextNumber = await getNextTicketNumber();

      // First attempt
      const { data, error } = await insertTask(nextNumber ?? undefined);

      if (error) {
        // Handle duplicate ticket_number gracefully with one retry
        if ((error as any).code === '23505') {
          console.warn("Duplicate ticket number detected (23505). Retrying with fresh number...");
          const freshNumber = await getNextTicketNumber();
          const retry = await insertTask(freshNumber ?? undefined);
          if (retry.error) throw retry.error;
        } else {
          throw error;
        }
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        smartTaskType: "task"
      });
      
      onTaskCreated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error creating task:', error);
      console.error('Error details:', {
        error,
        user: user?.id,
        projectId,
        formData
      });
      const message =
        error?.message ||
        (typeof error === 'string' ? error : 'Unknown error');
      toast({
        title: "Error",
        description: `Failed to create task: ${message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby="create-task-description">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        {/* A11y description to satisfy DialogContent requirement */}
        <p id="create-task-description" className="sr-only">
          Fill in the task details and choose priority and status, then create the task.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe the task..."
              rows={3}
            />
          </div>

          <SmartTaskTypeSelector
            value={formData.smartTaskType}
            onChange={(value) => setFormData(prev => ({ ...prev, smartTaskType: value }))}
            label="What type of work is this?"
            placeholder="Choose the type of work..."
          />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">Todo</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.title.trim()}>
              {loading ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
