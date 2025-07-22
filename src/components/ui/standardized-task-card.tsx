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
  } | null;
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
        <div className={`space-y-${compact ? '2' : '4'}`}>
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <h3 className={`font-semibold text-foreground leading-tight ${compact ? 'text-sm' : ''}`}>
                {task.title}
              </h3>
              {!compact && task.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {task.description}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="flex flex-wrap items-center gap-1">
                <Badge className={hierarchyColors[task.hierarchy_level]} variant="secondary">
                  {compact ? task.hierarchy_level.slice(0, 4) : task.hierarchy_level}
                </Badge>
                <Badge variant="outline" className={`text-xs ${compact ? 'text-xs' : ''}`}>
                  <span className="mr-1">{typeIcons[task.task_type]}</span>
                  {compact ? '' : task.task_type.replace('_', ' ')}
                </Badge>
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
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
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

          {/* Meta Information */}
          <div className={`flex items-center justify-between text-sm text-muted-foreground ${compact ? 'text-xs' : ''}`}>
            <div className="flex items-center gap-4">
              {task.assignees && task.assignees.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, compact ? 2 : 3).map((assignee, index) => (
                      <Avatar key={assignee.id} className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} border border-background`}>
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {assignee.initials}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {task.assignees.length > (compact ? 2 : 3) && (
                      <div className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} rounded-full bg-muted border border-background flex items-center justify-center text-xs`}>
                        +{task.assignees.length - (compact ? 2 : 3)}
                      </div>
                    )}
                  </div>
                  {!compact && (
                    <span>
                      {task.assignees.length === 1 
                        ? task.assignees[0].name
                        : `${task.assignees.length} assignees`
                      }
                    </span>
                  )}
                </div>
              )}
             
              {!compact && showProject && task.project && task.project.name && (
                <div className="flex items-center gap-1">
                  <span>in</span>
                  <span className="font-medium">{task.project.name}</span>
                </div>
              )}

              {dueDate && (
                <div className="flex items-center gap-1">
                  <Calendar className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
                  <span>
                    {compact ? 
                      new Date(dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) :
                      `Due ${new Date(dueDate).toLocaleDateString()}`
                    }
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                <MessageSquare className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
                <span>{task.comments || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Paperclip className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
                <span>{task.attachments || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className={`${compact ? 'w-2 h-2' : 'w-3 h-3'}`} />
                <span>0h</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}