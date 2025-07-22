import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { StandardizedTaskCard, StandardizedTask } from "@/components/ui/standardized-task-card";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { TaskRelationshipIndicator } from "@/components/tasks/TaskRelationshipIndicator";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";

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
  console.log("TaskCard rendering with task:", task.title);
  const { user } = useAuth();
  const { relationships } = useTaskRelationships(task.id);
  const { startTimer, runningEntry } = useTimeTracking();
  
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

  const handleStartTimer = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (user) {
      startTimer(task.id, task.title);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="relative">
        <StandardizedTaskCard
          task={task}
          onEdit={onEdit}
          onDelete={onDelete}
          onView={onView}
          compact={compact}
          showProject={false}
          interactive={true}
        />
        
        {/* Task relationships indicator */}
        {relationships.length > 0 && (
          <div className="absolute top-2 left-2">
            <TaskRelationshipIndicator 
              relationships={relationships} 
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