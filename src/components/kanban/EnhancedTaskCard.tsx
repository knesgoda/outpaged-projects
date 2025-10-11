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
  Clock,
  Eye,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Users,
  GitBranch
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useTimeTracking } from "@/hooks/useTimeTracking";
import { useAuth } from "@/hooks/useAuth";
import { TaskRelationshipIndicator } from "@/components/tasks/TaskRelationshipIndicator";
import { TaskBlockManager } from "@/components/tasks/TaskBlockManager";
import { useTaskRelationships } from "@/hooks/useTaskRelationships";
import { Task } from "@/components/kanban/TaskCard";

interface EnhancedTaskCardProps {
  task: Task;
  onEdit?: (task: Task) => void;
  onDelete?: (taskId: string) => void;
  onView?: (task: Task) => void;
  onUpdate?: () => void;
  compact?: boolean;
  showMetrics?: boolean;
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

const statusIcons = {
  todo: AlertCircle,
  in_progress: Clock,
  in_review: Eye,
  done: CheckCircle2,
  blocked: XCircle,
};

export function EnhancedTaskCard({ 
  task, 
  onEdit, 
  onDelete, 
  onView, 
  onUpdate,
  compact = false,
  showMetrics = true 
}: EnhancedTaskCardProps) {
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

  const StatusIcon = statusIcons[task.status as keyof typeof statusIcons] || AlertCircle;

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();
  const isDueSoon = task.dueDate && new Date(task.dueDate) <= new Date(Date.now() + 24 * 60 * 60 * 1000);

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onView?.(task)}
      className={`cursor-pointer hover:shadow-medium transition-all duration-300 bg-card border-border touch-manipulation animate-fade-in ${
        compact ? 'min-h-[100px]' : 'min-h-[140px]'
      } ${
        isDragging ? "opacity-50 rotate-1 shadow-large scale-105 animate-scale-in" : "hover:scale-[1.02] hover-scale"
      } ${
        task.blocked ? "border-destructive/50 bg-destructive/5 border-l-4 border-l-destructive" : ""
      } ${
        isOverdue ? "border-destructive border-r-4" : isDueSoon ? "border-warning border-r-4" : ""
      }`}
    >
      <CardContent className={compact ? "p-3 space-y-2" : "p-4 space-y-3"}>
        {/* Header with hierarchy level, task type and priority */}
        <div className="flex items-start justify-between">
          <div className="flex flex-wrap gap-1">
            <Badge className={hierarchyColors[task.hierarchy_level]} variant="secondary">
              <span className="text-xs font-medium">{task.hierarchy_level}</span>
            </Badge>
            <Badge variant="outline" className="text-xs">
              <span className="mr-1">{typeIcons[task.task_type as keyof typeof typeIcons]}</span>
              {compact ? task.task_type.charAt(0).toUpperCase() : task.task_type.replace('_', ' ')}
            </Badge>
            {task.story_points && (
              <Badge variant="outline" className="text-xs">
                {task.story_points} pts
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <StatusIcon className={`w-3 h-3 ${
                task.status === 'done' ? 'text-success' : 
                task.status === 'blocked' || task.blocked ? 'text-destructive' :
                task.status === 'in_progress' ? 'text-primary' : 'text-muted-foreground'
              }`} />
            </div>
            <Badge className={priorityColors[task.priority]} variant="secondary">
              <Flag className="w-3 h-3 mr-1" />
              <span className="text-xs">{compact ? task.priority.charAt(0).toUpperCase() : task.priority}</span>
            </Badge>
            {!compact && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="w-6 h-6 opacity-50 hover:opacity-100 touch-manipulation"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50 bg-background" align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView?.(task); }}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit?.(task); }}>
                    <MoreHorizontal className="w-4 h-4 mr-2" />
                    Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <GitBranch className="w-4 h-4 mr-2" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={(e) => { e.stopPropagation(); onDelete?.(task.id); }}
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Title and Description */}
        <div className="space-y-2">
          <h4 className={`font-medium text-foreground leading-snug ${compact ? 'text-sm' : 'text-base'}`}>
            {task.title}
          </h4>
          {!compact && task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
        </div>

        {/* Blocking Status */}
        {task.blocked && (
          <div className="flex items-center gap-2">
            <TaskBlockManager 
              task={{...task, blocked: task.blocked || false}} 
              onUpdate={() => onUpdate?.()} 
            />
          </div>
        )}

        {/* Tags */}
        {!compact && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-2 py-0">
                {tag}
              </Badge>
            ))}
            {task.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-2 py-0">
                +{task.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Task Relationships */}
        {!compact && relationships.length > 0 && (
          <div className="flex flex-wrap gap-1">
            <TaskRelationshipIndicator
              taskId={task.id}
              compact={true}
            />
          </div>
        )}

        {/* Blocking Reason */}
        {task.blocked && task.blocking_reason && !compact && (
          <div className="text-xs text-destructive bg-destructive/10 p-2 rounded border animate-fade-in">
            <strong>Blocked:</strong> {task.blocking_reason}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 text-muted-foreground flex-wrap">
            {task.dueDate && (
              <div className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-destructive font-medium' : isDueSoon ? 'text-warning font-medium' : ''
              }`}>
                <Calendar className="w-3 h-3" />
                <span className={compact ? "text-xs" : "hidden sm:inline"}>
                  {compact ? task.dueDate.split(' ')[0] : task.dueDate}
                </span>
              </div>
            )}
            {showMetrics && (
              <>
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
                {relationships.length > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <GitBranch className="w-3 h-3" />
                    {relationships.length}
                  </div>
                )}
              </>
            )}
          </div>
          
          {task.assignees && task.assignees.length > 0 && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3 text-muted-foreground" />
              <div className="flex -space-x-1">
                {task.assignees.slice(0, compact ? 2 : 3).map((assignee) => (
                  <Avatar key={assignee.id} className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} border-2 border-background`}>
                    <AvatarImage src={assignee.avatar} alt={assignee.name} />
                    <AvatarFallback className="text-xs">
                      {assignee.initials}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > (compact ? 2 : 3) && (
                  <div className={`${compact ? 'w-5 h-5' : 'w-6 h-6'} rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium`}>
                    +{task.assignees.length - (compact ? 2 : 3)}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}