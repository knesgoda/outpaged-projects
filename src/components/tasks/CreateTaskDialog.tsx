import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SmartTaskTypeSelector, SMART_TASK_TYPE_OPTIONS } from "./SmartTaskTypeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import AssigneeProjectMemberSelect from "./AssigneeProjectMemberSelect";
import RelationshipPicker from "./RelationshipPicker";

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
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const [storyPoints, setStoryPoints] = useState<string>("");
  const [relationship, setRelationship] = useState<{
    relationship_type: "blocks" | "depends_on" | "duplicates" | "relates_to";
    target_task_id: string;
    notes?: string;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Don't render dialog if user is not authenticated
  if (!user) {
    return null;
  }

  // Insert task and let the DB trigger assign ticket_number atomically
  const insertTask = async () => {
    const selectedOption = SMART_TASK_TYPE_OPTIONS.find(option => option.id === formData.smartTaskType);
    if (!selectedOption) {
      throw new Error("Invalid task type selected");
    }

    console.log("Inserting task (DB will assign ticket_number):", {
      title: formData.title,
      projectId,
      status: formData.status,
      priority: formData.priority,
      story_points: storyPoints ? Number(storyPoints) : undefined
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
        story_points: storyPoints ? Number(storyPoints) : null,
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

    if (!formData.title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a task title.",
        variant: "destructive",
      });
      return;
    }

    console.log('Creating task with:', {
      user: user.id,
      projectId,
      formData,
      storyPoints,
      assigneeIds,
      relationship
    });

    setLoading(true);
    try {
      // Single attempt: rely entirely on DB trigger for ticket_number
      const { data: newTask, error } = await insertTask();

      // In rare cases of a conflict, retry once
      if (error && (error as any).code === '23505') {
        console.warn("Conflict detected (23505). Retrying insert to let trigger assign a fresh number...");
        const retry = await insertTask();
        if (retry.error) throw retry.error;
        // Use the retried data
        const created = retry.data;
        // Post-create operations (assignees & relationship)
        await postCreateOperations(created?.id);
      } else if (error) {
        throw error;
      } else {
        await postCreateOperations(newTask?.id);
      }

      toast({
        title: "Success",
        description: "Task created successfully",
      });

      // Reset state
      setFormData({
        title: "",
        description: "",
        priority: "medium",
        status: "todo",
        smartTaskType: "task"
      });
      setAssigneeIds([]);
      setStoryPoints("");
      setRelationship(null);
      
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

  const postCreateOperations = async (taskId?: string) => {
    if (!taskId) return;

    // 1) Assign selected users
    if (assigneeIds.length > 0) {
      const assigneeInserts = assigneeIds.map((id) => ({
        task_id: taskId,
        user_id: id,
        assigned_by: user!.id
      }));
      const { error: assigneeError } = await supabase.from("task_assignees").insert(assigneeInserts);
      if (assigneeError) {
        console.error("Failed to add assignees:", assigneeError);
        toast({
          title: "Warning",
          description: "Task created but failed to add assignees.",
          variant: "destructive",
        });
      }
    }

    // 2) Optional relationship
    if (relationship?.target_task_id && relationship.relationship_type) {
      const { error: relError } = await supabase
        .from("task_relationships")
        .insert({
          source_task_id: taskId,
          target_task_id: relationship.target_task_id,
          relationship_type: relationship.relationship_type,
          notes: relationship.notes || null,
          created_by: user!.id,
        });
      if (relError) {
        console.error("Failed to create relationship:", relError);
        toast({
          title: "Warning",
          description: "Task created but failed to create the relationship.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
          <DialogDescription id="create-task-description">
            Fill in the details, assign teammates, add story points, and optionally link to another ticket.
          </DialogDescription>
        </DialogHeader>

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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AssigneeProjectMemberSelect
              projectId={projectId}
              value={assigneeIds}
              onChange={setAssigneeIds}
              label="Assign to"
            />

            <div className="space-y-2">
              <Label htmlFor="story_points">Story points</Label>
              <Input
                id="story_points"
                type="number"
                min="0"
                step="1"
                placeholder="e.g. 3"
                value={storyPoints}
                onChange={(e) => setStoryPoints(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3 border rounded-md p-3">
            <div className="text-sm font-medium">Link to another ticket (optional)</div>
            <RelationshipPicker
              projectId={projectId}
              value={relationship}
              onChange={setRelationship}
            />
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
