import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskCard, Task } from "./TaskCard";
import { Plus, MoreHorizontal, Settings } from "lucide-react";
import type { ColumnBaseMetadata, KanbanColumnType } from "@/types/boardColumns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  limit?: number;
  metadata?: ColumnBaseMetadata;
  columnType?: KanbanColumnType;
}

interface KanbanColumnProps {
  column: Column;
  onAddTask?: (columnId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (columnId: string) => void;
  onViewTask?: (task: Task) => void;
  isDraggable?: boolean;
}

export function KanbanColumn({
  column,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onEditColumn,
  onDeleteColumn,
  onViewTask,
  isDraggable = false,
}: KanbanColumnProps) {
  const droppableId = `legacy-${column.id}`;
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: {
      columnId: column.id,
      swimlaneId: null,
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
      type: "column",
      column,
    },
    disabled: !isDraggable,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const columnLimit = column.metadata?.wip?.columnLimit ?? column.limit;
  const isOverLimit =
    typeof columnLimit === "number" && column.tasks.length >= columnLimit;

  const columnShadow = isOver
    ? "0 24px 56px -32px rgba(55, 120, 255, 0.45)"
    : "var(--shadow-soft)";

  return (
    <motion.div
      ref={isDraggable ? setSortableRef : undefined}
      style={style}
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeInOut" }}
      className={cn(
        "group/kanban-column flex w-80 flex-shrink-0 rounded-[12px] outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-[#001B33]",
        isDragging ? "opacity-80" : "opacity-100"
      )}
      tabIndex={isDraggable ? 0 : -1}
    >
      <Card
        className={cn(
          "h-fit w-full overflow-hidden rounded-[12px] border border-white/10 bg-[#001B33] text-[hsl(var(--accent-foreground))] backdrop-blur-sm transition-shadow",
          isOver ? "ring-2 ring-[hsl(var(--accent))]" : "ring-1 ring-white/10"
        )}
        style={{ boxShadow: columnShadow }}
      >
        <CardHeader className="border-b border-white/10 pb-3">
          <div className="flex items-center justify-between">
            <div
              className={cn(
                "flex flex-1 items-center gap-2 text-white/90",
                isDraggable ? "cursor-grab active:cursor-grabbing" : ""
              )}
              {...(isDraggable ? { ...attributes, ...listeners } : {})}
            >
              <CardTitle className="text-sm font-semibold text-white">
                {column.title}
              </CardTitle>
              <Badge
                variant="secondary"
                className="rounded-full border border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--accent))]"
              >
                {column.tasks.length}
                {typeof columnLimit === "number" && `/${columnLimit}`}
              </Badge>
              {isOverLimit && (
                <Badge
                  variant="destructive"
                  className="rounded-full border border-[hsl(var(--warning))]/40 bg-[hsl(var(--warning))]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[hsl(var(--warning))]"
                >
                  WIP limit reached
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/15 focus-visible:ring-offset-[#001B33]"
                onClick={() => onAddTask?.(column.id)}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/15 focus-visible:ring-offset-[#001B33]"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="z-50" align="end">
                  <DropdownMenuItem onClick={() => onEditColumn?.(column)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Column
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onAddTask?.(column.id)}>
                    <Plus className="mr-2 h-4 w-4" />
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
        <CardContent className="px-4 pb-5 pt-4">
          <div ref={setNodeRef} className="min-h-[500px] space-y-3 pb-2">
            <SortableContext
              items={column.tasks.map((task) => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onView={onViewTask}
                />
              ))}
            </SortableContext>

            {column.tasks.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/15 bg-white/5">
                <div className="space-y-2 text-center">
                  <p className="text-sm text-white/70">
                    No tasks in {column.title}
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/15"
                    onClick={() => onAddTask?.(column.id)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Add task
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
