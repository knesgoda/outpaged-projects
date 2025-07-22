import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  Calendar, 
  MessageSquare, 
  Paperclip, 
  Clock,
  Edit,
  Plus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface StandardizedTask {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  hierarchy_level: "initiative" | "epic" | "story" | "task" | "subtask";
  task_type: "story" | "epic" | "initiative" | "task" | "subtask" | "bug" | "feature_request" | "design";
  parent_id?: string;
  project_id?: string;
  swimlane_id?: string;
  assignees?: Array<{
    id: string;
    name: string;
    avatar?: string;
    initials: string;
  }>;
  dueDate?: string;
  due_date?: string; // Support both formats
  tags: string[];
  comments: number;
  attachments: number;
  children?: StandardizedTask[];
  story_points?: number;
  blocked?: boolean;
  blocking_reason?: string;
  project?: {
    name?: string;
    code?: string;
  } | null;
  ticket_number?: number;
  created_at?: string;
  updated_at?: string;
}

interface StandardizedTaskCardProps {
  task: StandardizedTask;
  onEdit?: (task: StandardizedTask) => void;
  onDelete?: (taskId: string) => void;
  onView?: (task: StandardizedTask) => void;
  onCreateSubTask?: (task: StandardizedTask) => void;
  compact?: boolean;
  onClick?: (task: StandardizedTask) => void;
  showProject?: boolean;
  interactive?: boolean; // For kanban drag functionality
}

const priorityColors = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-warning/20 text-warning",
  high: "bg-destructive/20 text-destructive",
  urgent: "bg-destructive text-destructive-foreground",
};

const statusColors = {
  todo: "bg-muted text-muted-foreground",
  in_progress: "bg-primary/20 text-primary",
  in_review: "bg-warning/20 text-warning", 
  done: "bg-success/20 text-success",
  blocked: "bg-destructive/20 text-destructive",
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

export function StandardizedTaskCard({
  task,
  onEdit,
  onDelete,
  onView,
  onCreateSubTask,
  compact = false,
  onClick,
  showProject = true,
  interactive = false
}: StandardizedTaskCardProps) {
  console.log("StandardizedTaskCard rendering with task:", task.title);
  const dueDate = task.dueDate || task.due_date;

  const handleCardClick = () => {
    if (onClick) {
      onClick(task);
    } else if (onView) {
      onView(task);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) onEdit(task);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) onDelete(task.id);
  };

  const handleCreateSubTaskClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCreateSubTask) onCreateSubTask(task);
  };

  return (
    <Card 
      className={`hover:shadow-medium transition-all duration-200 cursor-pointer group ${
        compact ? 'p-3' : ''
      } ${interactive ? 'hover:scale-[1.02]' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className={compact ? "p-3" : "p-6"}>
        <div className={`space-y-${compact ? '2' : '3'}`}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              {/* Task ID */}
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground font-mono">
                  {task.project?.code && task.ticket_number 
                    ? `${task.project.code}-${task.ticket_number}`
                    : task.id?.slice(0, 8) || 'NEW'
                  }
                </p>
                <Badge className={hierarchyColors[task.hierarchy_level]} variant="secondary">
                  <span className="mr-1">{typeIcons[task.task_type]}</span>
                  {compact ? task.hierarchy_level.slice(0, 4) : task.hierarchy_level}
                </Badge>
              </div>
              
              {/* Title */}
              <h3 className={`font-semibold text-foreground leading-tight line-clamp-2 ${compact ? 'text-sm' : ''}`}>
                {task.title}
              </h3>
              
              {/* Description - only show in non-compact mode */}
              {!compact && task.description && (
                <p className="text-xs text-muted-foreground line-clamp-1">
                  {task.description.replace(/<[^>]*>/g, '').slice(0, 60)}...
                </p>
              )}
            </div>
            
            {/* Only show dropdown menu, remove extra close button */}
            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    ⋯
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEdit && (
                    <DropdownMenuItem onClick={handleEditClick}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Task
                    </DropdownMenuItem>
                  )}
                  {onCreateSubTask && (task.hierarchy_level === 'epic' || task.hierarchy_level === 'initiative' || task.hierarchy_level === 'story') && (
                    <DropdownMenuItem onClick={handleCreateSubTaskClick}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create Sub-task
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={handleDeleteClick}
                    >
                      Delete
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Status and Priority Badges Row */}
          <div className="flex items-center gap-1 flex-wrap">
            <Badge className={priorityColors[task.priority]} variant="secondary">
              {compact ? task.priority.charAt(0).toUpperCase() : task.priority}
            </Badge>
            <Badge className={statusColors[task.status as keyof typeof statusColors] || statusColors.todo} variant="secondary">
              {compact ? task.status.replace('_', '').charAt(0).toUpperCase() : task.status.replace('_', ' ')}
            </Badge>
            {task.story_points && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                {task.story_points} SP
              </Badge>
            )}
            {task.blocked && (
              <Badge variant="destructive" className="text-xs">
                🚫 Blocked
              </Badge>
            )}
          </div>

          {/* Bottom Row - Assignees and Meta */}
          <div className={`flex items-center justify-between text-xs text-muted-foreground ${compact ? 'text-xs' : ''}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Assignees */}
              {task.assignees && task.assignees.length > 0 && (
                <div className="flex items-center gap-1">
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, compact ? 1 : 2).map((assignee, index) => (
                      <Avatar key={assignee.id} className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} border border-background`}>
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > (compact ? 1 : 2) && (
                      <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-muted border border-background flex items-center justify-center text-xs`}>
                        +{task.assignees.length - (compact ? 1 : 2)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Due Date */}
              {dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">
                    {new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
            </div>

            {/* Right side meta */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{task.comments || 0}</span>
              </div>
              {(task.attachments || 0) > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  <span>{task.attachments}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}