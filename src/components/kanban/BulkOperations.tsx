
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Task } from "./TaskCard";
import { 
  CheckSquare, 
  Square, 
  Users, 
  Tag, 
  Trash2, 
  Archive,
  Move,
  Copy
} from "lucide-react";

interface BulkOperationsProps {
  selectedTasks: string[];
  onSelectionChange: (taskIds: string[]) => void;
  tasks: Task[];
  onOperationComplete: () => void;
  availableAssignees?: Array<{ id: string; name: string; avatar?: string }>;
  availableColumns?: Array<{ id: string; title: string }>;
}

export function BulkOperations({
  selectedTasks,
  onSelectionChange,
  tasks,
  onOperationComplete,
  availableAssignees = [],
  availableColumns = []
}: BulkOperationsProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isAllSelected = selectedTasks.length === tasks.length && tasks.length > 0;
  const isPartiallySelected = selectedTasks.length > 0 && selectedTasks.length < tasks.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map(task => task.id));
    }
  };

  const bulkUpdateStatus = async (status: string) => {
    if (selectedTasks.length === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status })
        .in('id', selectedTasks);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedTasks.length} tasks`,
      });

      onSelectionChange([]);
      onOperationComplete();
    } catch (error) {
      console.error('Error updating tasks:', error);
      toast({
        title: "Error",
        description: "Failed to update tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bulkUpdatePriority = async (priority: string) => {
    if (selectedTasks.length === 0) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ priority })
        .in('id', selectedTasks);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated priority for ${selectedTasks.length} tasks`,
      });

      onSelectionChange([]);
      onOperationComplete();
    } catch (error) {
      console.error('Error updating tasks:', error);
      toast({
        title: "Error",
        description: "Failed to update priority",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bulkAssign = async (assigneeId: string) => {
    if (selectedTasks.length === 0) return;

    setLoading(true);
    try {
      // Remove existing assignments for these tasks
      await supabase
        .from('task_assignees')
        .delete()
        .in('task_id', selectedTasks);

      // Add new assignments
      const assignments = selectedTasks.map(taskId => ({
        task_id: taskId,
        user_id: assigneeId,
        assigned_by: (await supabase.auth.getUser()).data.user?.id
      }));

      const { error } = await supabase
        .from('task_assignees')
        .insert(assignments);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Assigned ${selectedTasks.length} tasks`,
      });

      onSelectionChange([]);
      onOperationComplete();
    } catch (error) {
      console.error('Error assigning tasks:', error);
      toast({
        title: "Error",
        description: "Failed to assign tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    
    if (!confirm(`Delete ${selectedTasks.length} tasks? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', selectedTasks);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedTasks.length} tasks`,
      });

      onSelectionChange([]);
      onOperationComplete();
    } catch (error) {
      console.error('Error deleting tasks:', error);
      toast({
        title: "Error",
        description: "Failed to delete tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (selectedTasks.length === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={toggleSelectAll}
              className={isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}
            />
            <span>{selectedTasks.length} task{selectedTasks.length > 1 ? 's' : ''} selected</span>
          </div>
          <Badge variant="secondary">{selectedTasks.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {/* Status Updates */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateStatus('todo')}
              disabled={loading}
            >
              → Todo
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateStatus('in_progress')}
              disabled={loading}
            >
              → In Progress
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdateStatus('done')}
              disabled={loading}
            >
              → Done
            </Button>
          </div>

          {/* Priority Updates */}
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdatePriority('low')}
              disabled={loading}
            >
              Low Priority
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdatePriority('high')}
              disabled={loading}
            >
              High Priority
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => bulkUpdatePriority('urgent')}
              disabled={loading}
            >
              Urgent
            </Button>
          </div>

          {/* Assignee Selection */}
          {availableAssignees.length > 0 && (
            <Select onValueChange={bulkAssign}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                {availableAssignees.map((assignee) => (
                  <SelectItem key={assignee.id} value={assignee.id}>
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {assignee.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {assignee.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Destructive Actions */}
          <div className="flex gap-1 ml-auto">
            <Button
              size="sm"
              variant="destructive"
              onClick={bulkDelete}
              disabled={loading}
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        <div className="text-xs text-muted-foreground">
          Hold Ctrl/Cmd and click tasks to select multiple, or use the checkbox above to select all
        </div>
      </CardContent>
    </Card>
  );
}
