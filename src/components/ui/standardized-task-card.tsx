import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useMemo, useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { loadTaskIntegrationStatus } from "@/services/taskIntegrations";
import {
  Calendar,
  MessageSquare,
  Paperclip,
  Clock,
  Edit,
  Plus,
  UserPlus,
  ListPlus,
  Timer,
  Clock3,
  GitBranch,
  Workflow,
  Palette,
  LifeBuoy,
  CalendarClock,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  TaskFileReference,
  TaskLinkReference,
  TaskRelationSummary,
  TaskRollup,
  TaskSubitemSummary,
  TaskTag,
  TaskHierarchyLevel,
  TaskPriority,
  TaskStatus,
  TaskType,
  TaskIntegrationBadge,
} from "@/types/tasks";

export interface StandardizedTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus | string;
  priority: TaskPriority;
  hierarchy_level: TaskHierarchyLevel;
  task_type: TaskType;
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
  start_date?: string | null;
  end_date?: string | null;
  estimated_hours?: number | null;
  actual_hours?: number | null;
  tags: string[];
  tagDetails?: TaskTag[];
  comments?: number;
  comment_count?: number;
  attachments?: number;
  attachment_count?: number;
  files?: TaskFileReference[];
  links?: TaskLinkReference[];
  relations?: TaskRelationSummary[];
  subitems?: TaskSubitemSummary[];
  rollup?: TaskRollup;
  externalLinks?: string[];
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
  integrations?: TaskIntegrationBadge[];
}


export interface StandardizedTaskCardProps {
  task: StandardizedTask;
  onEdit?: (task: StandardizedTask) => void;
  onDelete?: (taskId: string) => void;
  onView?: (task: StandardizedTask) => void;
  onCreateSubTask?: (task: StandardizedTask) => void;
  compact?: boolean;
  onClick?: (task: StandardizedTask) => void;
  showProject?: boolean;
  interactive?: boolean; // For kanban drag functionality
  enableInlineEditing?: boolean;
  onInlineUpdate?: (
    field: "title" | "status" | "due_date" | "description" | "assignees",
    value: unknown,
    task: StandardizedTask
  ) => Promise<void> | void;
  onLogTime?: (task: StandardizedTask) => void;
  onStartTimer?: (task: StandardizedTask) => void;
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

const integrationIconMap: Record<TaskIntegrationBadge["type"], ComponentType<SVGProps<SVGSVGElement>>> = {
  git: GitBranch,
  ci: Workflow,
  design: Palette,
  support: LifeBuoy,
  calendar: CalendarClock,
};

const integrationStatusClasses: Record<TaskIntegrationBadge["status"], string> = {
  connected: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-200",
  error: "bg-destructive/10 text-destructive border-destructive/40",
  pending: "bg-muted/50 text-muted-foreground border-border/60",
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
  interactive = false,
  enableInlineEditing = false,
  onInlineUpdate,
  onLogTime,
  onStartTimer,
}: StandardizedTaskCardProps) {
  const { toast } = useToast();
  const dueDateDisplay = task.due_date
    ? new Date(task.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : task.dueDate;
  const startDateDisplay = task.start_date
    ? new Date(task.start_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : undefined;
  const endDateDisplay = task.end_date
    ? new Date(task.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : undefined;
  const commentTotal = task.comment_count ?? task.comments ?? 0;
  const attachmentTotal =
    task.attachment_count ?? task.attachments ?? (task.files ? task.files.length : 0);
  const [resolvedIntegrations, setResolvedIntegrations] = useState<TaskIntegrationBadge[] | null>(
    task.integrations ?? null
  );

  const truncatedDescription = useMemo(() => {
    if (!task.description) {
      return "";
    }
    const plain = task.description
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (plain.length <= 60) {
      return plain;
    }
    return `${plain.slice(0, 60).trimEnd()}…`;
  }, [task.description]);

  useEffect(() => {
    let cancelled = false;

    if (task.integrations && task.integrations.length > 0) {
      setResolvedIntegrations(task.integrations);
      return () => {
        cancelled = true;
      };
    }

    if (!task.id) {
      setResolvedIntegrations(null);
      return () => {
        cancelled = true;
      };
    }

    loadTaskIntegrationStatus({
      taskId: task.id,
      projectCode: task.project?.code ?? null,
    })
      .then((badges) => {
        if (!cancelled) {
          setResolvedIntegrations(badges);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setResolvedIntegrations([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [task.id, task.project?.code, task.integrations]);

  const tagBadges = (task.tagDetails && task.tagDetails.length > 0
    ? task.tagDetails
    : task.tags.map((label) => ({ id: label, label, color: undefined as string | undefined })))
    .filter(Boolean);
  const rollup = task.rollup;
  const relations = task.relations ?? [];
  const integrationBadges = useMemo(
    () => (resolvedIntegrations ?? []).filter((badge) => badge && badge.label && badge.type),
    [resolvedIntegrations]
  );

  const [inlineField, setInlineField] = useState<
    | "title"
    | "status"
    | "due_date"
    | "description"
    | "assignees"
    | null
  >(null);
  const [inlineDraft, setInlineDraft] = useState("");
  const [inlineSaving, setInlineSaving] = useState(false);

  const openInlineEditor = (
    field: Exclude<Parameters<NonNullable<StandardizedTaskCardProps["onInlineUpdate"]>>[0], undefined>
  ) => {
    if (!enableInlineEditing) return;
    setInlineField(field);
    switch (field) {
      case "title":
        setInlineDraft(task.title ?? "");
        break;
      case "description":
        setInlineDraft(task.description ? task.description.replace(/<[^>]*>/g, "") : "");
        break;
      case "status":
        setInlineDraft(String(task.status ?? ""));
        break;
      case "due_date":
        if (task.due_date) {
          setInlineDraft(task.due_date.slice(0, 10));
        } else if (task.dueDate) {
          const parsed = new Date(task.dueDate);
          setInlineDraft(Number.isNaN(parsed.valueOf()) ? "" : parsed.toISOString().slice(0, 10));
        } else {
          setInlineDraft("");
        }
        break;
      case "assignees":
        setInlineDraft((task.assignees ?? []).map((assignee) => assignee.id).join(", "));
        break;
      default:
        setInlineDraft("");
    }
  };

  const closeInlineEditor = () => {
    setInlineField(null);
    setInlineDraft("");
    setInlineSaving(false);
  };

  const commitInlineUpdate = async (overrideDraft?: string) => {
    if (!inlineField || !onInlineUpdate) {
      closeInlineEditor();
      return;
    }

    setInlineSaving(true);

    const draftValue = overrideDraft ?? inlineDraft;

    const normalizeValue = () => {
      switch (inlineField) {
        case "assignees":
          return draftValue
            .split(/[,\s]+/)
            .map((entry) => entry.trim())
            .filter(Boolean);
        case "due_date":
          return draftValue ? new Date(draftValue).toISOString() : null;
        default:
          return draftValue;
      }
    };

    try {
      await onInlineUpdate(inlineField, normalizeValue(), task);
      closeInlineEditor();
    } catch (error) {
      setInlineSaving(false);
      toast({
        title: "Unable to update task",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

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
      className={`hover:shadow-medium transition-all duration-200 cursor-pointer group relative ${
        compact ? 'p-3' : ''
      } ${interactive ? 'hover:scale-[1.02]' : ''}`}
      onClick={handleCardClick}
    >
      <CardContent className={compact ? "p-3" : "p-6"}>
        {enableInlineEditing && (
          <div className="absolute right-2 top-2 hidden items-center gap-1 group-hover:flex">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(event) => {
                event.stopPropagation();
                openInlineEditor("assignees");
              }}
              aria-label="Assign task"
            >
              <UserPlus className="h-4 w-4" />
            </Button>
            {onCreateSubTask && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onCreateSubTask(task);
                }}
                aria-label="Add subitem"
              >
                <ListPlus className="h-4 w-4" />
              </Button>
            )}
            {onLogTime && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onLogTime(task);
                }}
                aria-label="Log time"
              >
                <Clock3 className="h-4 w-4" />
              </Button>
            )}
            {onStartTimer && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(event) => {
                  event.stopPropagation();
                  onStartTimer(task);
                }}
                aria-label="Start timer"
              >
                <Timer className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <div className={compact ? "space-y-2" : "space-y-3"}>
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
              {enableInlineEditing && inlineField === "title" ? (
                <div className="flex items-center gap-2">
                  <Input
                    autoFocus
                    value={inlineDraft}
                    onChange={(event) => setInlineDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void commitInlineUpdate();
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        closeInlineEditor();
                      }
                    }}
                    onBlur={() => void commitInlineUpdate()}
                    aria-label="Edit title"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={inlineSaving}
                    onClick={(event) => {
                      event.stopPropagation();
                      void commitInlineUpdate();
                    }}
                  >
                    {inlineSaving ? "Saving…" : "Save"}
                  </Button>
                </div>
              ) : (
                <h3
                  className={`font-semibold text-foreground leading-tight line-clamp-2 ${compact ? 'text-sm' : ''}`}
                  onClick={(event) => {
                    if (!enableInlineEditing) return;
                    event.stopPropagation();
                    openInlineEditor("title");
                  }}
                >
                  {task.title}
                </h3>
              )}

              {/* Description - only show in non-compact mode */}
              {!compact && enableInlineEditing && inlineField === "description" ? (
                <div className="flex flex-col gap-2">
                  <Textarea
                    autoFocus
                    value={inlineDraft}
                    rows={3}
                    onChange={(event) => setInlineDraft(event.target.value)}
                    onClick={(event) => event.stopPropagation()}
                    aria-label="Edit description"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={inlineSaving}
                      onClick={(event) => {
                        event.stopPropagation();
                        void commitInlineUpdate();
                      }}
                    >
                      {inlineSaving ? "Saving…" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(event) => {
                        event.stopPropagation();
                        closeInlineEditor();
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : !compact && truncatedDescription ? (
                <p
                  className="text-xs text-muted-foreground line-clamp-1"
                  onClick={(event) => {
                    if (!enableInlineEditing) return;
                    event.stopPropagation();
                    openInlineEditor("description");
                  }}
                >
                  {truncatedDescription}
                </p>
              ) : null}

              {integrationBadges.length > 0 && (
                <TooltipProvider>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {integrationBadges.map((badge) => {
                      const Icon = integrationIconMap[badge.type] ?? GitBranch;
                      const syncedAt = badge.lastSyncedAt
                        ? new Date(badge.lastSyncedAt).toLocaleString()
                        : null;
                      return (
                        <Tooltip key={`${badge.id}-${badge.type}`}>
                          <TooltipTrigger asChild>
                            <span className="inline-flex">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-medium",
                                  integrationStatusClasses[badge.status]
                                )}
                              >
                                <span className="flex items-center gap-1">
                                  <Icon className="h-3 w-3" aria-hidden="true" />
                                  {badge.label}
                                </span>
                              </Badge>
                            </span>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs text-xs">
                            <p>{badge.tooltip}</p>
                            {syncedAt ? <p className="mt-1 text-[11px] text-muted-foreground">Last sync {syncedAt}</p> : null}
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </TooltipProvider>
              )}

              {tagBadges.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {tagBadges.slice(0, compact ? 2 : 4).map((tag) => (
                    <Badge
                      key={`${task.id}-${tag.id}`}
                      variant="outline"
                      className="text-[10px]"
                      style={tag.color ? { borderColor: tag.color, color: tag.color } : undefined}
                    >
                      {tag.label}
                    </Badge>
                  ))}
                  {tagBadges.length > (compact ? 2 : 4) && (
                    <Badge variant="outline" className="text-[10px]">
                      +{tagBadges.length - (compact ? 2 : 4)}
                    </Badge>
                  )}
                </div>
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
                  {enableInlineEditing && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        openInlineEditor("assignees");
                      }}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Assign
                    </DropdownMenuItem>
                  )}
                  {onLogTime && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onLogTime(task);
                      }}
                    >
                      <Clock3 className="w-4 h-4 mr-2" />
                      Log Time
                    </DropdownMenuItem>
                  )}
                  {onStartTimer && (
                    <DropdownMenuItem
                      onClick={(event) => {
                        event.stopPropagation();
                        onStartTimer(task);
                      }}
                    >
                      <Timer className="w-4 h-4 mr-2" />
                      Start Timer
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
            {enableInlineEditing && inlineField === "status" ? (
              <Select
                value={inlineDraft}
                onValueChange={(value) => {
                  setInlineDraft(value);
                  void commitInlineUpdate(value);
                }}
              >
                <SelectTrigger
                  className="h-7 w-32 text-xs"
                  onClick={(event) => event.stopPropagation()}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(statusColors).map((status) => (
                    <SelectItem key={status} value={status}>
                      {status.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Badge
                className={statusColors[task.status as keyof typeof statusColors] || statusColors.todo}
                variant="secondary"
                onClick={(event) => {
                  if (!enableInlineEditing) return;
                  event.stopPropagation();
                  openInlineEditor("status");
                }}
              >
                {compact ? task.status.replace('_', '').charAt(0).toUpperCase() : task.status.replace('_', ' ')}
              </Badge>
            )}
            {task.story_points && (
              <Badge variant="outline" className="text-xs bg-primary/10 text-primary">
                {task.story_points} SP
              </Badge>
            )}
            {task.status === 'waiting' && (
              <Badge variant="outline" className="text-xs bg-warning/20 text-warning">
                ⏳ Waiting
              </Badge>
            )}
            {task.blocked && (
              <Badge variant="destructive" className="text-xs">
                {`🚫 Blocked${task.blocking_reason ? ` – ${task.blocking_reason}` : ''}`}
              </Badge>
            )}
          </div>

          {(startDateDisplay || dueDateDisplay || endDateDisplay || task.estimated_hours || task.actual_hours) && (
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {startDateDisplay && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Start {startDateDisplay}</span>
                </span>
              )}
              {dueDateDisplay && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>Due {dueDateDisplay}</span>
                </span>
              )}
              {endDateDisplay && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  <span>End {endDateDisplay}</span>
                </span>
              )}
              {task.estimated_hours != null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.estimated_hours}h est.</span>
                </span>
              )}
              {task.actual_hours != null && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{task.actual_hours}h actual</span>
                </span>
              )}
            </div>
          )}

          {rollup && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Subitems</span>
                <span>
                  {rollup.completed}/{rollup.total}
                </span>
              </div>
              <Progress value={Math.round((rollup.progress ?? 0) * 100)} className="h-1.5" />
            </div>
          )}

          {relations.length > 0 && (
            <div className="flex flex-wrap gap-1 text-xs">
              {relations.slice(0, compact ? 2 : 4).map((relation) => (
                <Badge key={`${relation.id}-${relation.direction}`} variant="secondary" className="capitalize">
                  {relation.direction === 'incoming' ? '⬅' : '➡'} {relation.type.replace('_', ' ')}
                </Badge>
              ))}
              {relations.length > (compact ? 2 : 4) && (
                <Badge variant="secondary" className="capitalize">
                  +{relations.length - (compact ? 2 : 4)} more
                </Badge>
              )}
            </div>
          )}

          {/* Bottom Row - Assignees and Meta */}
          <div className={`flex items-center justify-between text-xs text-muted-foreground ${compact ? 'text-xs' : ''}`}>
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {/* Assignees */}
              {enableInlineEditing && inlineField === "assignees" ? (
                <Input
                  autoFocus
                  className="h-7"
                  value={inlineDraft}
                  onChange={(event) => setInlineDraft(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={() => void commitInlineUpdate()}
                  placeholder="user-id-1, user-id-2"
                  aria-label="Edit assignees"
                />
              ) : task.assignees && task.assignees.length > 0 ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(event) => {
                    if (!enableInlineEditing) return;
                    event.stopPropagation();
                    openInlineEditor("assignees");
                  }}
                >
                  <div className="flex -space-x-1">
                    {task.assignees.slice(0, compact ? 1 : 2).map((assignee) => (
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
              ) : null}

              {/* Due Date */}
              {enableInlineEditing && inlineField === "due_date" ? (
                <Input
                  type="date"
                  autoFocus
                  value={inlineDraft}
                  className="h-7 w-32"
                  onChange={(event) => setInlineDraft(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onBlur={() => void commitInlineUpdate()}
                  aria-label="Edit due date"
                />
              ) : dueDateDisplay ? (
                <div
                  className="flex items-center gap-1"
                  onClick={(event) => {
                    if (!enableInlineEditing) return;
                    event.stopPropagation();
                    openInlineEditor("due_date");
                  }}
                >
                  <Calendar className="w-3 h-3" />
                  <span className="truncate">{dueDateDisplay}</span>
                </div>
              ) : null}
            </div>

            {/* Right side meta */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                <span>{commentTotal}</span>
              </div>
              {attachmentTotal > 0 && (
                <div className="flex items-center gap-1">
                  <Paperclip className="w-3 h-3" />
                  <span>{attachmentTotal}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}