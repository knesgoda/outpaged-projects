import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { GripVertical, Square, CheckSquare, Circle, AlertCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TaskPriority, TaskStatus } from "@/types/tasks";
import { getPriorityLabel } from "@/lib/priorityMapping";

export interface StandardizedTaskCardProps {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType?: string;
  assigneeAvatar?: string | null;
  assigneeName?: string;
  dueDate?: string | null;
  blocked?: boolean;
  tags?: string[];
  ticketNumber?: number;
  projectCode?: string;
  progress?: number;
  onClick?: () => void;
  className?: string;
}

const PRIORITY_COLORS: Record<TaskPriority, string> = {
  P0: "bg-red-500 text-white border-red-600",
  P1: "bg-orange-500 text-white border-orange-600",
  P2: "bg-yellow-500 text-white border-yellow-600",
  P3: "bg-blue-500 text-white border-blue-600",
  P4: "bg-gray-500 text-white border-gray-600",
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  todo: "bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-200",
  in_progress: "bg-blue-500 text-white border-blue-600",
  in_review: "bg-purple-500 text-white border-purple-600",
  done: "bg-green-500 text-white border-green-600",
  blocked: "bg-red-500 text-white border-red-600",
  waiting: "bg-amber-500 text-white border-amber-600",
};

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  bug: <AlertCircle className="h-4 w-4 text-red-500" />,
  feature_request: <Square className="h-4 w-4 text-blue-500" />,
  task: <CheckSquare className="h-4 w-4 text-gray-500" />,
  story: <Circle className="h-4 w-4 text-purple-500" />,
};

export function StandardizedTaskCard({
  id,
  title,
  status,
  priority,
  taskType = "task",
  assigneeAvatar,
  assigneeName,
  dueDate,
  blocked,
  tags = [],
  ticketNumber,
  projectCode,
  progress,
  onClick,
  className,
}: StandardizedTaskCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const taskKey = ticketNumber && projectCode ? `${projectCode}-${ticketNumber}` : null;
  const priorityLabel = getPriorityLabel(priority);
  const statusLabel = status.replace("_", " ");

  const visibleTags = tags.slice(0, 3);
  const remainingTagsCount = tags.length - 3;

  const formatDueDate = (date: string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const calculateProgress = () => {
    if (progress !== undefined) return progress;
    // Status-based fallback
    if (status === "done") return 100;
    if (status === "in_progress" || status === "in_review") return 50;
    return 0;
  };

  const actualProgress = calculateProgress();

  return (
    <Card
      className={cn(
        "group relative cursor-pointer border border-border bg-card p-3 transition-all hover:shadow-md",
        isDragging && "opacity-50",
        blocked && "border-red-500 border-l-4",
        className
      )}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div className="absolute left-1 top-3 opacity-0 transition-opacity group-hover:opacity-50">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Main Content Row */}
      <div className="ml-4 flex items-start gap-2">
        {/* Task Type Icon */}
        <div className="mt-0.5 flex-shrink-0">
          {TASK_TYPE_ICONS[taskType] || TASK_TYPE_ICONS.task}
        </div>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h3 className="truncate text-sm font-medium text-foreground">
            {title}
          </h3>
        </div>

        {/* Status Badge */}
        <Badge
          variant="secondary"
          className={cn(
            "flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold",
            STATUS_COLORS[status]
          )}
        >
          {statusLabel}
        </Badge>

        {/* Assignee Avatar */}
        {assigneeName && (
          <Avatar className="h-6 w-6 flex-shrink-0">
            <AvatarImage src={assigneeAvatar || undefined} alt={assigneeName} />
            <AvatarFallback className="text-xs">
              {assigneeName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Due Date */}
        {dueDate && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatDueDate(dueDate)}</span>
          </div>
        )}

        {/* Priority Badge */}
        <Badge
          variant="outline"
          className={cn(
            "flex-shrink-0 rounded-md border px-2 py-0.5 text-xs font-bold",
            PRIORITY_COLORS[priority]
          )}
        >
          {priorityLabel}
        </Badge>

        {/* Blocked Badge */}
        {blocked && (
          <Badge
            variant="destructive"
            className="flex-shrink-0 rounded-md px-2 py-0.5 text-xs font-semibold"
          >
            Blocked
          </Badge>
        )}
      </div>

      {/* Tags Row */}
      {tags.length > 0 && (
        <div className="ml-10 mt-2 flex flex-wrap gap-1">
          {visibleTags.map((tag, index) => (
            <Badge
              key={index}
              variant="outline"
              className="rounded-full bg-muted px-2 py-0 text-xs text-muted-foreground"
            >
              {tag}
            </Badge>
          ))}
          {remainingTagsCount > 0 && (
            <Badge
              variant="outline"
              className="rounded-full bg-muted px-2 py-0 text-xs text-muted-foreground"
            >
              +{remainingTagsCount} more
            </Badge>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="ml-10 mt-2">
        <Progress value={actualProgress} className="h-1.5" />
      </div>

      {/* Task Key */}
      {taskKey && (
        <div className="ml-10 mt-1 text-xs text-muted-foreground">
          {taskKey}
        </div>
      )}
    </Card>
  );
}
