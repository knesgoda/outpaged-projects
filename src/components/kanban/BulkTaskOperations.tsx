import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
  CheckSquare, 
  MoreHorizontal, 
  Trash2, 
  Copy, 
  Move, 
  Tag,
  User,
  Calendar,
  X
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { createNotification } from "@/services/notifications";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  project_id: string;
}

interface BulkTaskOperationsProps {
  tasks: Task[];
  selectedTasks: string[];
  onSelectionChange: (taskIds: string[]) => void;
  onTasksUpdated: () => void;
}

export const BulkTaskOperations = ({
  tasks,
  selectedTasks,
  onSelectionChange,
  onTasksUpdated
}: BulkTaskOperationsProps) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const notifyStatusChanges = async (taskIds: string[], newStatus: string) => {
    if (taskIds.length === 0) return;

    try {
      const { data: subscriptions, error: subsError } = await supabase
        .from("notification_subscriptions")
        .select("user_id, entity_id")
        .eq("entity_type", "task")
        .in("entity_id", taskIds);

      if (subsError) {
        console.warn("Unable to load task subscriptions:", subsError);
        return;
      }

      if (!subscriptions || subscriptions.length === 0) {
        return;
      }

      const subscriberIds = Array.from(
        new Set(
          subscriptions
            .map((subscription) => subscription.user_id)
            .filter((userId) => userId && userId !== user?.id)
        )
      );

      if (subscriberIds.length === 0) {
        return;
      }

      const { data: preferenceRows, error: preferenceError } = await supabase
        .from("notification_preferences")
        .select("user_id, in_app")
        .in("user_id", subscriberIds);

      if (preferenceError) {
        console.warn("Unable to load status change preferences:", preferenceError);
      }

      const allowed = new Set(
        subscriberIds.filter((subscriberId) => {
          const prefs = preferenceRows?.find((row) => row.user_id === subscriberId);
          const value = (prefs?.in_app as Record<string, boolean> | null | undefined)?.status_change;
          return value !== false;
        })
      );

      if (allowed.size === 0) {
        return;
      }

      const { data: tasksData, error: taskError } = await supabase
        .from("tasks")
        .select("id, title, name, project_id")
        .in("id", taskIds);

      if (taskError) {
        console.warn("Unable to load updated tasks for notifications:", taskError);
        return;
      }

      const actorName = user?.user_metadata?.full_name || user?.email || "Someone";

      await Promise.all(
        subscriptions.map(async (subscription) => {
          if (!allowed.has(subscription.user_id)) return;
          const task = tasksData?.find((record) => record.id === subscription.entity_id);
          if (!task) return;
          const taskTitle = (task as any).title || (task as any).name || "task";
          await createNotification({
            user_id: subscription.user_id,
            type: "status_change",
            title: `Status changed to ${newStatus}`,
            body: `${actorName} moved "${taskTitle}" to ${newStatus}`,
            entity_type: "task",
            entity_id: subscription.entity_id,
            project_id: (task as any).project_id,
            link: `/tasks/${subscription.entity_id}`,
          });
        })
      );
    } catch (notificationError) {
      console.warn("Failed to create status change notifications:", notificationError);
    }
  };

  const selectedTasksData = tasks.filter(task => selectedTasks.includes(task.id));

  const handleSelectAll = () => {
    if (selectedTasks.length === tasks.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(tasks.map(task => task.id));
    }
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedTasks.length === 0) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: newStatus as any })
        .in("id", selectedTasks);

      if (error) throw error;

      await notifyStatusChanges(selectedTasks, newStatus);

      toast({
        title: "Success",
        description: `Updated ${selectedTasks.length} tasks to ${newStatus}`,
      });

      onSelectionChange([]);
      onTasksUpdated();
    } catch (error: any) {
      console.error("Error updating tasks:", error);
      toast({
        title: "Error",
        description: "Failed to update tasks",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkPriorityUpdate = async (newPriority: string) => {
    if (selectedTasks.length === 0) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ priority: newPriority as any })
        .in("id", selectedTasks);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Updated ${selectedTasks.length} tasks priority to ${newPriority}`,
      });

      onSelectionChange([]);
      onTasksUpdated();
    } catch (error: any) {
      console.error("Error updating task priorities:", error);
      toast({
        title: "Error",
        description: "Failed to update task priorities",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;

    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} tasks? This action cannot be undone.`)) {
      return;
    }

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .in("id", selectedTasks);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${selectedTasks.length} tasks`,
      });

      onSelectionChange([]);
      onTasksUpdated();
    } catch (error: any) {
      console.error("Error deleting tasks:", error);
      toast({
        title: "Error",
        description: "Failed to delete tasks",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDuplicate = async () => {
    if (selectedTasks.length === 0) return;

    setIsProcessing(true);
    try {
      const { data: tasksToClone, error: fetchError } = await supabase
        .from("tasks")
        .select("*")
        .in("id", selectedTasks);

      if (fetchError) throw fetchError;

      const duplicatedTasks = tasksToClone.map(task => ({
        ...task,
        id: undefined,
        title: `${task.title} (Copy)`,
        created_at: undefined,
        updated_at: undefined,
      }));

      const { error: insertError } = await supabase
        .from("tasks")
        .insert(duplicatedTasks);

      if (insertError) throw insertError;

      toast({
        title: "Success",
        description: `Duplicated ${selectedTasks.length} tasks`,
      });

      onSelectionChange([]);
      onTasksUpdated();
    } catch (error: any) {
      console.error("Error duplicating tasks:", error);
      toast({
        title: "Error",
        description: "Failed to duplicate tasks",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (selectedTasks.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Checkbox 
          checked={false}
          onCheckedChange={handleSelectAll}
        />
        <span>Select tasks for bulk operations</span>
      </div>
    );
  }

  return (
    <Card className="p-4 border-primary/20 bg-primary/5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Checkbox 
            checked={selectedTasks.length === tasks.length}
            onCheckedChange={handleSelectAll}
          />
          <Badge variant="secondary" className="gap-1">
            <CheckSquare className="h-3 w-3" />
            {selectedTasks.length} selected
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSelectionChange([])}
          >
            <X className="h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Update */}
          <Select onValueChange={handleBulkStatusUpdate} disabled={isProcessing}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todo">To Do</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="in_review">In Review</SelectItem>
              <SelectItem value="done">Done</SelectItem>
            </SelectContent>
          </Select>

          {/* Priority Update */}
          <Select onValueChange={handleBulkPriorityUpdate} disabled={isProcessing}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>

          {/* More Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleBulkDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Tasks
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleBulkDelete}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Selected Tasks Preview */}
      <div className="mt-3 flex flex-wrap gap-1">
        {selectedTasksData.slice(0, 5).map((task) => (
          <Badge key={task.id} variant="outline" className="text-xs">
            {task.title.length > 20 ? `${task.title.slice(0, 20)}...` : task.title}
          </Badge>
        ))}
        {selectedTasksData.length > 5 && (
          <Badge variant="outline" className="text-xs">
            +{selectedTasksData.length - 5} more
          </Badge>
        )}
      </div>
    </Card>
  );
};