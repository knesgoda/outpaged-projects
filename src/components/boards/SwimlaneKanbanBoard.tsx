import { useState, useEffect, useMemo } from "react";
import { DragDropContext, Droppable, Draggable, type DropResult } from "@hello-pangea/dnd";
import { SwimlaneRow } from "./SwimlaneRow";
import { SwimlaneSelectorMenu } from "./SwimlaneSelectorMenu";
import { EnhancedTaskCard } from "@/components/kanban/EnhancedTaskCard";
import { swimlaneService, type SwimlaneDefinition } from "@/services/boards/swimlaneService";
import type { SwimlaneMode } from "@/types/kanban";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Settings2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface Column {
  id: string;
  name: string;
  position: number;
  color?: string;
}

interface SwimlaneKanbanBoardProps {
  tasks: any[];
  columns: Column[];
  swimlaneMode?: SwimlaneMode;
  customField?: string;
  onTaskMove?: (taskId: string, toColumnId: string, toLaneValue: any) => void;
  onSwimlaneConfigChange?: (mode: SwimlaneMode, customField?: string) => void;
  className?: string;
}

export function SwimlaneKanbanBoard({
  tasks,
  columns,
  swimlaneMode = 'none',
  customField,
  onTaskMove,
  onSwimlaneConfigChange,
  className,
}: SwimlaneKanbanBoardProps) {
  const [collapsedLanes, setCollapsedLanes] = useState<Set<string>>(new Set());
  const [currentMode, setCurrentMode] = useState<SwimlaneMode>(swimlaneMode);
  const [currentField, setCurrentField] = useState<string | undefined>(customField);

  // Derive swimlanes based on mode
  const { lanes } = useMemo(() => {
    return swimlaneService.deriveSwimlanesForMode(tasks, currentMode, currentField);
  }, [tasks, currentMode, currentField]);

  // Group tasks by lane and column
  const tasksByLaneAndColumn = useMemo(() => {
    const grouped: Record<string, Record<string, any[]>> = {};

    lanes.forEach(lane => {
      grouped[lane.id] = {};
      columns.forEach(col => {
        grouped[lane.id][col.id] = [];
      });

      const laneTasks = swimlaneService.getTasksForLane(tasks, lane);
      laneTasks.forEach(task => {
        const columnId = task.column_id || task.status || columns[0]?.id;
        if (grouped[lane.id][columnId]) {
          grouped[lane.id][columnId].push(task);
        }
      });
    });

    return grouped;
  }, [lanes, columns, tasks]);

  // Filter out empty lanes (except if it's the only lane)
  const visibleLanes = useMemo(() => {
    if (lanes.length === 1) return lanes;
    return lanes.filter(lane => (lane.count || 0) > 0);
  }, [lanes]);

  const handleToggleCollapse = (laneId: string) => {
    setCollapsedLanes(prev => {
      const next = new Set(prev);
      if (next.has(laneId)) {
        next.delete(laneId);
      } else {
        next.add(laneId);
      }
      return next;
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const { source, destination, draggableId: taskId } = result;
    
    // Parse droppable IDs: format is "lane-{laneId}-column-{columnId}"
    const destParts = destination.droppableId.split('-');
    const destLaneId = destParts[1];
    const destColumnId = destParts[3];

    const destLane = lanes.find(l => l.id === destLaneId);
    const destLaneValue = destLane?.value;

    onTaskMove?.(taskId, destColumnId, destLaneValue);
  };

  const handleSwimlaneChange = (mode: SwimlaneMode, field?: string) => {
    setCurrentMode(mode);
    setCurrentField(field);
    onSwimlaneConfigChange?.(mode, field);
  };

  // Get available custom fields from tasks
  const availableFields = useMemo(() => {
    const fields = new Set<string>();
    tasks.forEach(task => {
      if (task.custom_fields) {
        Object.keys(task.custom_fields).forEach(key => fields.add(key));
      }
    });
    return Array.from(fields);
  }, [tasks]);

  return (
    <div className={cn("swimlane-kanban-board h-full flex flex-col", className)}>
      {/* Header with Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            {currentMode === 'none' ? 'Board View' : `Grouped by ${currentMode}`}
          </span>
          {visibleLanes.length > 1 && (
            <span className="text-xs text-muted-foreground">
              ({visibleLanes.length} lanes)
            </span>
          )}
        </div>

        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <Settings2 className="h-4 w-4 mr-2" />
              Swimlane Settings
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Swimlane Configuration</SheetTitle>
              <SheetDescription>
                Choose how to group tasks horizontally into swimlanes
              </SheetDescription>
            </SheetHeader>
            <div className="mt-6">
              <SwimlaneSelectorMenu
                value={currentMode}
                customField={currentField}
                availableFields={availableFields}
                onChange={handleSwimlaneChange}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-auto">
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="min-w-full">
            {/* Column Headers - Fixed */}
            <div className="sticky top-0 z-20 bg-background border-b flex">
              <div className="sticky left-0 z-30 min-w-[200px] max-w-[200px] bg-background border-r" />
              {columns.map(column => (
                <div
                  key={column.id}
                  className="min-w-[280px] px-4 py-3 border-r bg-muted/30"
                  style={{ borderTopColor: column.color }}
                >
                  <h3 className="font-semibold text-sm">{column.name}</h3>
                </div>
              ))}
            </div>

            {/* Swimlane Rows */}
            {visibleLanes.map(lane => (
              <SwimlaneRow
                key={lane.id}
                lane={lane}
                isCollapsed={collapsedLanes.has(lane.id)}
                onToggleCollapse={handleToggleCollapse}
              >
                {columns.map(column => {
                  const laneTasks = tasksByLaneAndColumn[lane.id]?.[column.id] || [];
                  const droppableId = `lane-${lane.id}-column-${column.id}`;

                  return (
                    <Droppable key={column.id} droppableId={droppableId}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={cn(
                            "min-w-[280px] px-2 py-2 border-r min-h-[100px]",
                            snapshot.isDraggingOver && "bg-accent/50"
                          )}
                        >
                          <div className="space-y-2">
                            {laneTasks.map((task, index) => (
                              <Draggable
                                key={task.id}
                                draggableId={task.id}
                                index={index}
                              >
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                  >
                                    <EnhancedTaskCard
                                      task={task}
                                    />
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>

                          {laneTasks.length === 0 && (
                            <div className="text-center text-sm text-muted-foreground py-4">
                              No tasks
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  );
                })}
              </SwimlaneRow>
            ))}

            {visibleLanes.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p>No tasks to display</p>
              </div>
            )}
          </div>
        </DragDropContext>
      </div>
    </div>
  );
}
