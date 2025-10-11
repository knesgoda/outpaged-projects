import { useMemo, useCallback } from "react";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useBoardViewContext } from "./context";

const UNGROUPED_KEY = "__ungrouped";

const getGroupKey = (groupingField: string | null, item: Record<string, unknown>) => {
  if (!groupingField) {
    return UNGROUPED_KEY;
  }

  const value = item[groupingField];
  if (value == null || value === "") {
    return UNGROUPED_KEY;
  }

  return String(value);
};

const getTitle = (item: Record<string, unknown>) => {
  if (typeof item.title === "string") {
    return item.title;
  }
  if (typeof item.name === "string") {
    return item.name;
  }
  if (typeof item.id === "string" || typeof item.id === "number") {
    return String(item.id);
  }
  return "Untitled";
};

const DEFAULT_GROUPING_FIELDS = ["status", "stage", "state"];

const findPositionInGroup = (
  collection: Record<string, unknown>[],
  groupingField: string | null,
  targetKey: string,
  index: number
) => {
  let count = 0;
  for (let position = 0; position < collection.length; position += 1) {
    if (getGroupKey(groupingField, collection[position]) === targetKey) {
      if (count === index) {
        return position;
      }
      count += 1;
    }
  }
  return -1;
};

export interface KanbanMoveParams {
  items: Record<string, unknown>[];
  groupingField: string | null;
  source: { droppableId: string; index: number };
  destination: { droppableId: string; index: number };
}

export const moveKanbanCard = ({
  items,
  groupingField,
  source,
  destination,
}: KanbanMoveParams): Record<string, unknown>[] => {
  const sourceKey = source.droppableId;
  const destinationKey = destination.droppableId;

  const itemIndex = findPositionInGroup(items, groupingField, sourceKey, source.index);
  if (itemIndex === -1) {
    return items;
  }

  const nextItems = [...items];
  const [moved] = nextItems.splice(itemIndex, 1);
  if (!moved) {
    return items;
  }

  const destinationIndex = (() => {
    if (destinationKey === sourceKey) {
      const indexInGroup = findPositionInGroup(nextItems, groupingField, destinationKey, destination.index);
      return indexInGroup === -1 ? nextItems.length : indexInGroup;
    }

    const indexInGroup = findPositionInGroup(nextItems, groupingField, destinationKey, destination.index);
    return indexInGroup === -1 ? nextItems.length : indexInGroup;
  })();

  const updatedItem =
    groupingField != null
      ? {
          ...moved,
          [groupingField]: destinationKey === UNGROUPED_KEY ? null : destinationKey,
        }
      : moved;

  nextItems.splice(destinationIndex, 0, updatedItem);
  return nextItems;
};

export function KanbanBoardView() {
  const { items, configuration, replaceItems, updateConfiguration, isLoading } =
    useBoardViewContext();

  const groupingField = configuration.grouping ?? DEFAULT_GROUPING_FIELDS.find((field) =>
    items.some((item) => item[field] != null)
  ) ?? null;

  const columns = useMemo(() => {
    const groups = new Map<string, Record<string, unknown>[]>();
    const keys: string[] = [];

    items.forEach((item) => {
      const key = getGroupKey(groupingField, item);
      if (!groups.has(key)) {
        groups.set(key, []);
        keys.push(key);
      }
      groups.get(key)!.push(item);
    });

    if (!groups.has(UNGROUPED_KEY)) {
      groups.set(UNGROUPED_KEY, []);
      keys.push(UNGROUPED_KEY);
    }

    return { keys, groups };
  }, [groupingField, items]);

  const availableFields = useMemo(() => {
    const fieldSet = new Set<string>();
    items.forEach((item) => {
      Object.keys(item).forEach((key) => fieldSet.add(key));
    });

    DEFAULT_GROUPING_FIELDS.forEach((field) => fieldSet.add(field));

    return Array.from(fieldSet);
  }, [items]);

  const handleGroupingChange = useCallback(
    (nextField: string) => {
      updateConfiguration({ grouping: nextField === UNGROUPED_KEY ? null : nextField });
    },
    [updateConfiguration]
  );

  const handleDragEnd = useCallback(
    (result: DropResult) => {
      const { destination, source } = result;
      if (!destination) {
        return;
      }

      const updated = moveKanbanCard({
        items,
        groupingField,
        source,
        destination,
      });

      if (updated !== items) {
        replaceItems(updated);
      }
    },
    [groupingField, items, replaceItems]
  );

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading view…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <div className="flex items-center gap-3">
        <Label className="text-xs uppercase text-muted-foreground">Group by</Label>
        <Select value={groupingField ?? UNGROUPED_KEY} onValueChange={handleGroupingChange}>
          <SelectTrigger className="h-8 w-44">
            <SelectValue placeholder="Select field" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNGROUPED_KEY}>Ungrouped</SelectItem>
            {availableFields.map((field) => (
              <SelectItem key={field} value={field}>
                {field}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Badge variant="outline">{items.length} items</Badge>
      </div>

      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="grid flex-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columns.keys.map((key) => {
            const columnItems = columns.groups.get(key) ?? [];
            const columnLabel = key === UNGROUPED_KEY ? "No value" : key;

            return (
              <Droppable key={key} droppableId={key}>
                {(provided, snapshot) => (
                  <Card
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={cn(
                      "flex h-full flex-col border-muted/70",
                      snapshot.isDraggingOver && "border-primary shadow-lg"
                    )}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{columnLabel}</span>
                        <Badge variant="secondary">{columnItems.length}</Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col gap-3">
                      {columnItems.length === 0 ? (
                        <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                          Drop cards here
                        </div>
                      ) : null}
                      {columnItems.map((item, index) => (
                        <Draggable
                          key={`card-${key}-${index}`}
                          draggableId={`card-${key}-${index}`}
                          index={index}
                        >
                          {(dragProvided, dragSnapshot) => (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={cn(
                                "rounded-md border bg-card p-3 text-sm shadow-sm",
                                dragSnapshot.isDragging && "border-primary shadow-lg"
                              )}
                            >
                              <div className="font-medium">{getTitle(item)}</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {Object.entries(item)
                                  .filter(([field]) => field !== groupingField)
                                  .slice(0, 3)
                                  .map(([field, value]) => (
                                    <div key={field}>
                                      <span className="font-medium">{field}:</span> {String(value ?? "—")}
                                    </div>
                                  ))}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </CardContent>
                  </Card>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>
    </div>
  );
}

