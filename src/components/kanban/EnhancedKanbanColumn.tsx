import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { TaskCard, Task } from "./TaskCard";
import { QuickTaskEntry } from "./QuickTaskEntry";
import { Plus, MoreHorizontal, Settings, Zap } from "lucide-react";
import type { ColumnBaseMetadata, KanbanColumnType } from "@/types/boardColumns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WIPIndicator } from "@/components/boards/WIPIndicator";
import { ColumnSettingsMenu } from "@/components/boards/ColumnSettingsMenu";
import { getWIPStatus } from "@/services/boards/columnService";
import type { ColumnMetadata } from "@/types/kanban";

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  limit?: number;
  metadata?: ColumnBaseMetadata;
  columnType?: KanbanColumnType;
}

interface EnhancedKanbanColumnProps {
  column: Column;
  onAddTask?: (columnId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (columnId: string) => void;
  onViewTask?: (task: Task) => void;
  isDraggable?: boolean;
  viewMode?: 'standard' | 'compact' | 'list';
  selectedTasks?: string[];
  onTaskSelectionChange?: (taskIds: string[]) => void;
  showQuickAdd?: { columnId: string; swimlaneId?: string } | null;
  onShowQuickAdd?: (data: { columnId: string; swimlaneId?: string } | null) => void;
  onQuickTaskCreated?: () => void;
  swimlaneId?: string;
  projectId?: string;
  availableAssignees?: Array<{ id: string; name: string }>;
}

export function EnhancedKanbanColumn({ 
  column, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onViewTask,
  isDraggable = false,
  viewMode = 'standard',
  selectedTasks = [],
  onTaskSelectionChange,
  showQuickAdd,
  onShowQuickAdd,
  onQuickTaskCreated,
  swimlaneId,
  projectId = "",
  availableAssignees = []
}: EnhancedKanbanColumnProps) {
  const droppableId = swimlaneId ? `${column.id}::${swimlaneId}` : column.id;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      columnId: column.id,
      swimlaneId: swimlaneId ?? null,
    },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: {
      type: 'column',
      column,
    },
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const laneKey = swimlaneId ?? "__unassigned__";
  const laneLimit = column.metadata?.wip?.laneLimits?.[laneKey];
  const columnLimit = column.metadata?.wip?.columnLimit ?? column.limit;
  const overrideState = column.metadata?.wip?.overrides;
  const columnOverride = overrideState?.column;
  const laneOverride = laneKey ? overrideState?.lanes?.[laneKey] : undefined;
  const isOverrideActive = (override?: { active?: boolean; expiresAt?: string | null }) => {
    if (!override || !override.active) return false;
    if (override.expiresAt) {
      const expiry = new Date(override.expiresAt);
      if (Number.isNaN(expiry.getTime())) {
        return true;
      }
      return expiry.getTime() > Date.now();
    }
    return true;
  };
  const activeOverride = laneOverride && isOverrideActive(laneOverride) ? laneOverride : columnOverride;
  const hasActiveOverride = isOverrideActive(activeOverride);
  const displayLimit =
    typeof laneLimit === "number"
      ? laneLimit
      : typeof columnLimit === "number"
        ? columnLimit
        : undefined;
  const limitSource = typeof laneLimit === "number" ? "Lane limit" : "Column limit";
  const appliedLimit = displayLimit;
  const isOverLimit =
    typeof appliedLimit === "number" && column.tasks.length >= appliedLimit;
  const isShowingQuickAdd = showQuickAdd?.columnId === column.id && showQuickAdd?.swimlaneId === swimlaneId;
  const columnSelectedTasks = column.tasks.filter(task => selectedTasks.includes(task.id));
  const isAllSelected = columnSelectedTasks.length === column.tasks.length && column.tasks.length > 0;
  const isPartiallySelected = columnSelectedTasks.length > 0 && columnSelectedTasks.length < column.tasks.length;

  const toggleSelectAllInColumn = () => {
    if (!onTaskSelectionChange) return;
    
    const columnTaskIds = column.tasks.map(task => task.id);
    if (isAllSelected) {
      // Deselect all tasks in this column
      onTaskSelectionChange(selectedTasks.filter(id => !columnTaskIds.includes(id)));
    } else {
      // Select all tasks in this column
      const newSelection = [...selectedTasks];
      columnTaskIds.forEach(taskId => {
        if (!newSelection.includes(taskId)) {
          newSelection.push(taskId);
        }
      });
      onTaskSelectionChange(newSelection);
    }
  };

  const toggleTaskSelection = (taskId: string, event: React.MouseEvent) => {
    if (!onTaskSelectionChange) return;
    
    event.preventDefault();
    event.stopPropagation();
    
    if (event.ctrlKey || event.metaKey) {
      // Multi-select mode
      if (selectedTasks.includes(taskId)) {
        onTaskSelectionChange(selectedTasks.filter(id => id !== taskId));
      } else {
        onTaskSelectionChange([...selectedTasks, taskId]);
      }
    } else {
      // Single select mode
      onTaskSelectionChange([taskId]);
    }
  };

  return (
    <div 
      ref={isDraggable ? setSortableRef : undefined}
      style={style}
      className={`flex-shrink-0 w-[85vw] sm:w-80 snap-start ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card
        className={`h-fit transition-colors ${
          isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
        } ${hasActiveOverride ? "border-destructive/60 bg-destructive/5" : ""}`}
      >
        <CardHeader className={`pb-3 ${hasActiveOverride ? "bg-destructive/10" : ""}`}>
          <div className="flex items-center justify-between">
            <div
              className="flex items-center gap-2 flex-1"
              {...(isDraggable ? { ...attributes, ...listeners } : {})}
            >
              <CardTitle className={`text-sm font-medium text-foreground ${isDraggable ? 'cursor-grab active:cursor-grabbing' : ''}`}>
                {column.title}
              </CardTitle>
              
              {/* WIP Indicator */}
              <WIPIndicator 
                currentCount={column.tasks.length} 
                metadata={column.metadata as ColumnMetadata}
              />
              
              {hasActiveOverride && (
                <Badge variant="destructive" className="text-xs" data-testid="active-wip-override">
                  Override active
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {onTaskSelectionChange && column.tasks.length > 0 && (
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={toggleSelectAllInColumn}
                  className={`mr-2 ${isPartiallySelected ? "data-[state=checked]:bg-primary/50" : ""}`}
                />
              )}
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 sm:w-6 sm:h-6"
                onClick={() => onShowQuickAdd?.({ columnId: column.id, swimlaneId })}
                title="Quick add task"
              >
                <Zap className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="w-10 h-10 sm:w-6 sm:h-6"
                onClick={() => onAddTask?.(column.id)}
                title="Add task"
              >
                <Plus className="w-4 h-4" />
              </Button>
              
              {/* Column Settings */}
              <ColumnSettingsMenu
                columnId={column.id}
                columnName={column.title}
                metadata={column.metadata}
              />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-10 h-10 sm:w-6 sm:h-6">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50" align="end">
                  <DropdownMenuItem onClick={() => onEditColumn?.(column)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Edit Column
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddTask?.(column.id)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onDeleteColumn?.(column.id)}
                  >
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div
            ref={setNodeRef}
            className="space-y-3 min-h-[500px] pb-4"
          >
            {/* Quick Add Entry */}
            {isShowingQuickAdd && (
              <QuickTaskEntry
                projectId={projectId}
                columnId={column.id}
                swimlaneId={swimlaneId}
                availableAssignees={availableAssignees}
                onTaskCreated={() => {
                  onQuickTaskCreated?.();
                  onShowQuickAdd?.(null);
                }}
                onCancel={() => onShowQuickAdd?.(null)}
              />
            )}
            
            <SortableContext
              id={droppableId}
              items={column.tasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {column.tasks.map((task) => (
                <div 
                  key={task.id}
                  className={`relative ${selectedTasks.includes(task.id) ? 'ring-2 ring-primary/50' : ''}`}
                  onClick={(e) => {
                    if (e.ctrlKey || e.metaKey) {
                      toggleTaskSelection(task.id, e);
                    } else {
                      onViewTask?.(task);
                    }
                  }}
                >
                  {onTaskSelectionChange && (
                    <Checkbox
                      checked={selectedTasks.includes(task.id)}
                      onCheckedChange={() => {
                        if (selectedTasks.includes(task.id)) {
                          onTaskSelectionChange(selectedTasks.filter(id => id !== task.id));
                        } else {
                          onTaskSelectionChange([...selectedTasks, task.id]);
                        }
                      }}
                      className="absolute top-2 left-2 z-10 bg-background"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                  <TaskCard
                    task={task}
                    onEdit={onEditTask}
                    onDelete={onDeleteTask}
                    onView={onViewTask}
                    compact={viewMode === 'compact'}
                  />
                </div>
              ))}
            </SortableContext>
            
            {column.tasks.length === 0 && !isShowingQuickAdd && (
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No tasks in {column.title}
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => onShowQuickAdd?.({ columnId: column.id, swimlaneId })}
                    >
                      <Zap className="w-4 h-4 mr-1" />
                      Quick add
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-primary"
                      onClick={() => onAddTask?.(column.id)}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add task
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
