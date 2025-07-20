import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TaskCard, Task } from "./TaskCard";
import { Plus, MoreHorizontal, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface Column {
  id: string;
  title: string;
  tasks: Task[];
  color?: string;
  limit?: number;
}

interface KanbanColumnProps {
  column: Column;
  onAddTask?: (columnId: string) => void;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditColumn?: (column: Column) => void;
  onDeleteColumn?: (columnId: string) => void;
}

export function KanbanColumn({ 
  column, 
  onAddTask, 
  onEditTask, 
  onDeleteTask,
  onEditColumn,
  onDeleteColumn 
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isOverLimit = column.limit && column.tasks.length >= column.limit;

  return (
    <div className="flex-shrink-0 w-80">
      <Card className={`h-fit transition-colors ${
        isOver ? "ring-2 ring-primary/50 bg-primary/5" : ""
      }`}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-foreground">
                {column.title}
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {column.tasks.length}
                {column.limit && `/${column.limit}`}
              </Badge>
              {isOverLimit && (
                <Badge variant="destructive" className="text-xs">
                  Limit Reached
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="w-6 h-6"
                onClick={() => onAddTask?.(column.id)}
              >
                <Plus className="w-4 h-4" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
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
            <SortableContext
              items={column.tasks.map(task => task.id)}
              strategy={verticalListSortingStrategy}
            >
              {column.tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                />
              ))}
            </SortableContext>
            
            {column.tasks.length === 0 && (
              <div className="flex items-center justify-center h-32 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                <div className="text-center space-y-2">
                  <p className="text-sm text-muted-foreground">
                    No tasks in {column.title}
                  </p>
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
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}