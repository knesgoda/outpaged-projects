import { useEffect, useState, useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StandardizedTaskCard, StandardizedTask } from "@/components/ui/standardized-task-card";
import type { StandardizedTaskCardProps } from "@/components/ui/standardized-task-card";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { TaskRelationshipIndicator } from "@/components/tasks/TaskRelationshipIndicator";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";
import { updateTaskFields, replaceTaskAssignees } from "@/services/tasksService";

// Re-export the Task interface for backward compatibility
export interface Task extends StandardizedTask {}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onView?: (task: Task) => void;
  compact?: boolean;
}

export function TaskCard({ task, onEdit, onDelete, onView, compact }: TaskCardProps) {
  const { user } = useAuth();
  const { relationships } = useTaskRelationships(task.id);
  const { startTimer, runningEntry } = useTimeTracking();
  const [localTask, setLocalTask] = useState<StandardizedTask>(task);

  useEffect(() => {
    setLocalTask(task);
  }, [task]);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const handleStartTimer = useCallback(() => {
    if (user) {
      startTimer(localTask.id, localTask.title);
    }
  }, [localTask.id, localTask.title, startTimer, user]);

  const handleLogTime = useCallback(() => {
    if (onEdit) {
      onEdit(localTask);
    }
  }, [localTask, onEdit]);

  const handleInlineUpdate = useCallback<NonNullable<StandardizedTaskCardProps["onInlineUpdate"]>>(async (field, value) => {
    switch (field) {
      case "title": {
        const next = String(value ?? "");
        await updateTaskFields(localTask.id, { title: next });
        setLocalTask((prev) => ({ ...prev, title: next }));
        break;
      }
      case "description": {
        const next = typeof value === "string" ? value : String(value ?? "");
        await updateTaskFields(localTask.id, { description: next });
        setLocalTask((prev) => ({ ...prev, description: next }));
        break;
      }
      case "status": {
        const next = typeof value === "string" ? value : String(value ?? "");
        await updateTaskFields(localTask.id, { status: next as any });
        setLocalTask((prev) => ({ ...prev, status: next }) as typeof prev);
        break;
      }
      case "due_date": {
        const next = typeof value === "string" ? value : null;
        await updateTaskFields(localTask.id, { due_date: next });
        setLocalTask((prev) => ({ ...prev, due_date: next ?? undefined, dueDate: next ?? undefined }));
        break;
      }
      case "assignees": {
        const next = Array.isArray(value) ? value : [];
        await replaceTaskAssignees(localTask.id, next);
        setLocalTask((prev) => ({
          ...prev,
          assignees: next.map((id) => {
            const existing = prev.assignees?.find((assignee) => assignee.id === id);
            if (existing) return existing;
            const initials = id.slice(0, 2).toUpperCase();
            return { id, name: id, initials };
          }),
        }));
        break;
      }
      default:
        break;
    }
  }, [localTask, setLocalTask]);

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="relative">
        <StandardizedTaskCard
          task={localTask}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          compact={compact}
          showProject={false}
          interactive={true}
          enableInlineEditing
          onInlineUpdate={handleInlineUpdate}
          onLogTime={handleLogTime}
          onStartTimer={() => handleStartTimer()}
        />
        
        {/* Task relationships indicator */}
        {relationships.length > 0 && (
          <div className="absolute top-2 left-2">
            <TaskRelationshipIndicator 
              taskId={task.id}
              compact={compact}
            />
          </div>
        )}

        {/* Running timer indicator */}
        {runningEntry && runningEntry.task_id === task.id && (
          <div className="absolute top-2 right-2 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
}