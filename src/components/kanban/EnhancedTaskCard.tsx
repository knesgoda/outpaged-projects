import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
  GitBranch,
  Ban,
  TrendingUp
} from "lucide-react";
import { differenceInDays, formatDistanceToNow } from "date-fns";
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
import type { TaskWithDetails } from "@/types/tasks";
import { cn } from "@/lib/utils";

interface EnhancedTaskCardProps {
  task: TaskWithDetails;
  onEdit?: (task: TaskWithDetails) => void;
  onDelete?: (taskId: string) => void;
  onView?: (task: TaskWithDetails) => void;
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
  
  // Calculate aging (days since created)
  const agingDays = task.created_at 
    ? differenceInDays(new Date(), new Date(task.created_at))
    : 0;
  const isAging = agingDays > 7; // Highlight tasks older than 7 days
  
  // Check for due date status
  const isDueSoon = task.due_date 
    ? differenceInDays(new Date(task.due_date), new Date()) <= 2 && differenceInDays(new Date(task.due_date), new Date()) >= 0
    : false;
  const isOverdue = task.due_date 
    ? new Date(task.due_date) < new Date()
    : false;

  // Check if blocked
  const isBlocked = (task as any).blocked || false;
  const blockingReason = (task as any).blocking_reason || '';
  
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
          <div className="flex items-start justify-between gap-2">
            <h4 className={cn(
              "font-medium text-foreground leading-snug flex-1",
              compact ? 'text-sm' : 'text-base',
              isBlocked && "line-through opacity-60"
            )}>
              {task.title}
            </h4>
            
            {/* Blocked Pill */}
            {isBlocked && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="destructive" className="gap-1 flex-shrink-0">
                      <Ban className="h-3 w-3" />
                      BLOCKED
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">{blockingReason || 'Task is blocked'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          
          {!compact && task.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {task.description}
            </p>
          )}
          
          {/* Aging and SLA Indicators */}
          {(isAging || isOverdue || isDueSoon) && (
            <div className="flex gap-1.5 flex-wrap">
              {isAging && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 text-xs border-warning bg-warning/10 text-warning">
                        <TrendingUp className="h-3 w-3" />
                        {agingDays}d
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>In progress for {agingDays} days</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {isOverdue && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="destructive" className="gap-1 text-xs">
                        <AlertCircle className="h-3 w-3" />
                        Overdue
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatDistanceToNow(new Date(task.due_date!), { addSuffix: true })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              
              {isDueSoon && !isOverdue && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Badge variant="outline" className="gap-1 text-xs border-warning bg-warning/10 text-warning">
                        <Clock className="h-3 w-3" />
                        Due soon
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{formatDistanceToNow(new Date(task.due_date!), { addSuffix: true })}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
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
              <Badge key={tag.id} variant="outline" className="text-xs px-2 py-0">
                {tag.label}
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
            {task.due_date && (
              <div className={`flex items-center gap-1 text-xs ${
                isOverdue ? 'text-destructive font-medium' : isDueSoon ? 'text-warning font-medium' : ''
              }`}>
                <Calendar className="w-3 h-3" />
                <span className={compact ? "text-xs" : "hidden sm:inline"}>
                  {compact ? task.due_date.split(' ')[0] : task.due_date}
                </span>
              </div>
            )}
            {showMetrics && (
              <>
                {task.commentCount > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <MessageSquare className="w-3 h-3" />
                    {task.commentCount}
                  </div>
                )}
                {task.attachmentCount > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <Paperclip className="w-3 h-3" />
                    {task.attachmentCount}
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