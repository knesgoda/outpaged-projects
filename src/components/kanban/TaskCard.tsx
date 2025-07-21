import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  MoreHorizontal, 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  Flag,
  User,
  Clock,
  Eye
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { TaskRelationshipIndicator } from "@/components/tasks/TaskRelationshipIndicator";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  hierarchy_level: "initiative" | "epic" | "story" | "task" | "subtask";
  task_type: "story" | "epic" | "initiative" | "task" | "subtask" | "bug" | "feature_request" | "design";
  parent_id?: string;
  project_id?: string;
  assignee?: {
    name: string;
    avatar?: string;
    initials: string;
  };
  dueDate?: string;
  tags: string[];
  comments: number;
  attachments: number;
  children?: Task[];
}

interface TaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onView?: (task: Task) => void;
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

const hierarchyColors = {
  initiative: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  epic: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  story: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  task: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  subtask: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

const typeIcons = {
  story: "📖",
  epic: "🚀",
  initiative: "🎯",
  task: "✅",
  subtask: "🔸",
  bug: "🐛",
  feature_request: "✨",
  design: "🎨",
};

export function TaskCard({ task, onEdit, onDelete, onView }: TaskCardProps) {
  const { user } = useAuth();
  const { getTotalTimeForTask, formatDuration } = useTimeTracking();
  const { relationships } = useTaskRelationships(task.id);
  const totalTime = user ? getTotalTimeForTask(task.id) : 0;
  
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
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onView?.(task)}
      className={`cursor-pointer hover:shadow-medium transition-all duration-200 bg-card border-border touch-manipulation min-h-[120px] ${
        isDragging ? "opacity-50 rotate-2 shadow-large scale-105" : "hover:scale-[1.02]"
      }`}
    >
      <CardContent className="p-3 sm:p-4 space-y-3">
        {/* Header with hierarchy level, task type and priority */}
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            <Badge className={hierarchyColors[task.hierarchy_level]} variant="secondary">
              <span className="text-xs">{task.hierarchy_level}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className="mr-1">{typeIcons[task.task_type as keyof typeof typeIcons]}</span>
              {task.task_type.replace('_', ' ')}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={priorityColors[task.priority]} variant="secondary">
              <Flag className="w-3 h-3 mr-1" />
              <span className="text-xs sm:text-sm">{task.priority}</span>
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="w-8 h-8 sm:w-6 sm:h-6 opacity-50 hover:opacity-100 touch-manipulation"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-50" align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(task); }}>
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}>
                  Edit Task
                </DropdownMenuItem>
                <DropdownMenuItem>
                  Duplicate
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h4 className="font-medium text-foreground leading-snug text-sm sm:text-base">{task.title}</h4>
          {task.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Tags */}
        {task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Task Relationships */}
        {relationships.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <TaskRelationshipIndicator
              relationships={relationships}
              taskId={task.id}
              compact={true}
            />
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 sm:gap-3 text-muted-foreground flex-wrap">
            {task.dueDate && (
              <div className="flex items-center gap-1 text-xs">
                <Calendar className="w-3 h-3" />
                <span className="hidden sm:inline">{task.dueDate}</span>
                <span className="sm:hidden">{task.dueDate.split(' ')[0]}</span>
              </div>
            )}
            {task.comments > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <MessageSquare className="w-3 h-3" />
                {task.comments}
              </div>
            )}
            {task.attachments > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Paperclip className="w-3 h-3" />
                {task.attachments}
              </div>
            )}
            {totalTime > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <Clock className="w-3 h-3" />
                {formatDuration(totalTime)}
              </div>
            )}
          </div>
          
          {task.assignee && (
            <Avatar className="w-7 h-7 sm:w-6 sm:h-6">
              <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
              <AvatarFallback className="text-xs">
                {task.assignee.initials}
              </AvatarFallback>
            </Avatar>
          )}
        </div>
      </CardContent>
    </Card>
  );
}