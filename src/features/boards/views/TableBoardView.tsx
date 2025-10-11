import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  replaceTaskAssignees,
  type TaskUpdateInput,
} from "@/services/tasksService";
import type { BoardViewRecord } from "./context";
import { useBoardViewContext } from "./context";
import { BoardMetricsHeader } from "./BoardMetricsHeader";
import { useBoardPerformanceTracker } from "./useBoardPerformance";
import { useTaskUpdateQueue } from "./useTaskUpdateQueue";

const STATUS_OPTIONS = ["todo", "in_progress", "in_review", "done"] as const;
const ESTIMATED_ROW_HEIGHT = 52;
const LOAD_MORE_THRESHOLD = 12;

const isStatusField = (column: string) => /status/i.test(column);
const isDateField = (column: string) => /date|_at$/i.test(column);
const isAssigneeField = (column: string) => /assignee/i.test(column);

type DraftValue = string | string[];

interface EditingCell {
  row: number;
  column: string;
  mode: "status" | "date" | "assignees" | "text";
  originalValue: unknown;
}

const toDisplayValue = (value: unknown) => {
  if (value == null) {
    return "";
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch (_error) {
      return String(value);
    }
  }
  return String(value);
};

const normalizeAssigneeDraft = (value: DraftValue): string[] =>
  Array.isArray(value)
    ? value
    : String(value)
        .split(/[,\s]+/)
        .map((entry) => entry.trim())
        .filter(Boolean);

export function TableBoardView() {
  const {
    items,
    configuration,
    updateItem,
    replaceItems,
    isLoading,
    hasMore,
    isLoadingMore,
    loadMore,
  } = useBoardViewContext();
  const { toast } = useToast();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState<DraftValue>("");
  const [isSaving, setIsSaving] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const itemsRef = useRef(items);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  useBoardPerformanceTracker("table-board-view", items.length);

  const { enqueue: enqueueTaskUpdate } = useTaskUpdateQueue({
    onSuccess: (records) => {
      if (!records.length) {
        return;
      }

      const latest = itemsRef.current;
      const map = new Map<string, BoardViewRecord>();

      for (const record of records) {
        const id =
          typeof record.id === "string"
            ? record.id
            : typeof record.id === "number"
              ? String(record.id)
              : null;
        if (!id) continue;
        map.set(id, record);
      }

      if (map.size === 0) {
        return;
      }

      const next = latest.map((item) => {
        const id =
          typeof item.id === "string"
            ? item.id
            : typeof item.id === "number"
              ? String(item.id)
              : null;
        if (!id) {
          return item;
        }
        const updated = map.get(id);
        return updated ? ({ ...item, ...updated } as BoardViewRecord) : item;
      });

      replaceItems(next);
    },
  });

  const rowVirtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => {
      if (scrollRef.current) {
        return scrollRef.current;
      }
      if (typeof document !== "undefined") {
        return document.body;
      }
      return null;
    },
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 12,
    initialRect: () => ({
      width: scrollRef.current?.clientWidth ?? 1200,
      height: scrollRef.current?.clientHeight ?? 600,
    }),
  });

  const allColumns = useMemo(() => {
    const columns = new Set<string>();
    configuration.columnPreferences.order.forEach((column) => columns.add(column));
    configuration.columnPreferences.hidden.forEach((column) => columns.add(column));

    items.forEach((item) => {
      Object.keys(item).forEach((key) => columns.add(key));
    });

    return Array.from(columns);
  }, [configuration.columnPreferences.hidden, configuration.columnPreferences.order, items]);

  const visibleColumns = useMemo(() => {
    const ordered =
      configuration.columnPreferences.order.length > 0
        ? configuration.columnPreferences.order.filter((column) =>
            allColumns.includes(column)
          )
        : allColumns;

    const remaining = allColumns.filter((column) => !ordered.includes(column));

    const fullOrder = [...ordered, ...remaining];

    return fullOrder.filter(
      (column) => !configuration.columnPreferences.hidden.includes(column)
    );
  }, [
    allColumns,
    configuration.columnPreferences.hidden,
    configuration.columnPreferences.order,
  ]);

  const gridTemplateColumns = useMemo(
    () => `repeat(${visibleColumns.length}, minmax(0, 1fr))`,
    [visibleColumns.length]
  );

  const determineMode = (column: string): EditingCell["mode"] => {
    if (isAssigneeField(column)) return "assignees";
    if (isStatusField(column)) return "status";
    if (isDateField(column)) return "date";
    return "text";
  };

  const beginEditing = useCallback(
    (row: number, column: string, value: unknown) => {
      const mode = determineMode(column);
      setEditing({ row, column, mode, originalValue: value });

      if (mode === "assignees") {
        if (Array.isArray(value)) {
          const normalized = value
            .map((entry) => {
              if (typeof entry === "string") return entry;
              if (entry && typeof entry === "object") {
                if ("id" in entry && typeof entry.id === "string") {
                  return entry.id;
                }
                if (
                  "user_id" in entry &&
                  typeof (entry as { user_id?: unknown }).user_id === "string"
                ) {
                  return (entry as { user_id: string }).user_id;
                }
                if ("name" in entry && typeof entry.name === "string") {
                  return entry.name;
                }
              }
              return "";
            })
            .filter((entry) => entry && entry.length > 0);
          setDraftValue(normalized);
        } else if (typeof value === "string") {
          setDraftValue(value.split(/[,\s]+/).filter(Boolean));
        } else {
          setDraftValue([]);
        }
        return;
      }

      if (mode === "date" && typeof value === "string" && value.length >= 10) {
        setDraftValue(value.slice(0, 10));
        return;
      }

      setDraftValue(toDisplayValue(value));
    },
    []
  );

  const stopEditing = useCallback(() => {
    setEditing(null);
    setDraftValue("");
    setIsSaving(false);
  }, []);

  const toSnakeCase = (value: string) =>
    value
      .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
      .replace(/\s+/g, "_")
      .toLowerCase();

  const persistChange = useCallback(
    async (cell: EditingCell, value: DraftValue) => {
      const row = itemsRef.current[cell.row];
      const recordId =
        typeof row?.id === "string"
          ? row.id
          : typeof row?.id === "number"
            ? String(row.id)
            : undefined;
      if (!recordId) {
        return;
      }

      const field = toSnakeCase(cell.column) as keyof TaskUpdateInput;

      if (cell.mode === "assignees") {
        const ids = normalizeAssigneeDraft(value);
        await replaceTaskAssignees(recordId, ids);
        return;
      }

      let payloadValue: unknown = value;
      if (cell.mode === "date") {
        payloadValue =
          typeof value === "string" && value ? new Date(value).toISOString() : null;
      }

      await enqueueTaskUpdate({
        id: recordId,
        patch: {
          [field]: payloadValue,
        } as TaskUpdateInput,
      });
    },
    [enqueueTaskUpdate]
  );

  const commitEditing = useCallback(async () => {
    if (!editing || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const optimisticValue =
        editing.mode === "assignees"
          ? normalizeAssigneeDraft(draftValue)
          : editing.mode === "date"
            ? (typeof draftValue === "string" ? draftValue : "")
            : Array.isArray(draftValue)
              ? draftValue.join(", ")
              : draftValue;

      updateItem(editing.row, { [editing.column]: optimisticValue });
      await persistChange(editing, draftValue);
      stopEditing();
    } catch (error) {
      updateItem(editing.row, { [editing.column]: editing.originalValue });
      toast({
        title: "Unable to save change",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [draftValue, editing, isSaving, persistChange, stopEditing, toast, updateItem]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void commitEditing();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      stopEditing();
    }
  };

  const virtualRows = rowVirtualizer.getVirtualItems();
  const fallbackRows = useMemo(() => {
    if (virtualRows.length > 0 || items.length === 0) {
      return virtualRows;
    }
    const limit = Math.min(items.length, 120);
    return Array.from({ length: limit }, (_, index) => ({
      key: `fallback-${index}`,
      index,
      start: index * ESTIMATED_ROW_HEIGHT,
      size: ESTIMATED_ROW_HEIGHT,
    }));
  }, [items.length, virtualRows]);
  const renderedRows = virtualRows.length > 0 ? virtualRows : fallbackRows;
  const virtualHeight = rowVirtualizer.getTotalSize();
  const fallbackHeight = fallbackRows.length * ESTIMATED_ROW_HEIGHT;
  const totalMeasuredHeight = virtualRows.length > 0 ? virtualHeight : fallbackHeight;

  useEffect(() => {
    if (!hasMore || !loadMore || isLoadingMore) {
      return;
    }
    const last = renderedRows[renderedRows.length - 1];
    if (!last) {
      return;
    }
    if (last.index >= items.length - LOAD_MORE_THRESHOLD) {
      void loadMore();
    }
  }, [hasMore, isLoadingMore, items.length, loadMore, renderedRows]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Loading view…
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
        No records match the current filters.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <BoardMetricsHeader items={items} configuration={configuration} />
      <div className="overflow-x-auto">
        <div
          ref={scrollRef}
          data-testid="board-table-scroll"
          className="relative max-h-[70vh] min-w-[640px] overflow-auto rounded-md border"
        >
          <div role="table" className="min-w-full">
            <div
              role="rowgroup"
              className="sticky top-0 z-10 grid bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground"
              style={{ gridTemplateColumns }}
            >
              {visibleColumns.map((column) => (
                <div key={column} role="columnheader" className="border-b px-3 py-2 font-medium">
                  {column}
                </div>
              ))}
            </div>
            <div
              role="rowgroup"
              className="relative"
              style={{ height: totalMeasuredHeight }}
            >
              {renderedRows.map((virtualRow) => {
                const item = items[virtualRow.index];
                if (!item) {
                  return null;
                }

                return (
                  <div
                    key={virtualRow.key}
                    role="row"
                    ref={virtualRows.length > 0 ? rowVirtualizer.measureElement : undefined}
                    className="absolute grid border-b bg-background hover:bg-muted/40"
                    style={{
                      gridTemplateColumns,
                      height: virtualRow.size,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    data-row-index={virtualRow.index}
                  >
                    {visibleColumns.map((column) => {
                      const value = item[column];
                      const isEditing = editing?.row === virtualRow.index && editing.column === column;

                      return (
                        <div
                          key={column}
                          role="cell"
                          className="px-3 py-2 text-sm"
                          onClick={() => beginEditing(virtualRow.index, column, value)}
                        >
                          {isEditing ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {editing.mode === "status" ? (
                                <Select
                                  value={typeof draftValue === "string" ? draftValue : ""}
                                  onValueChange={(next) => setDraftValue(next)}
                                >
                                  <SelectTrigger className="h-9 w-44">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {STATUS_OPTIONS.map((option) => (
                                      <SelectItem key={option} value={option}>
                                        {option.replace(/_/g, " ")}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              ) : editing.mode === "date" ? (
                                <Input
                                  type="date"
                                  autoFocus
                                  value={typeof draftValue === "string" ? draftValue : ""}
                                  onChange={(event) => setDraftValue(event.target.value)}
                                  onBlur={() => void commitEditing()}
                                  aria-label={`Edit ${column}`}
                                />
                              ) : editing.mode === "assignees" ? (
                                <Input
                                  autoFocus
                                  value={Array.isArray(draftValue) ? draftValue.join(", ") : draftValue}
                                  onChange={(event) =>
                                    setDraftValue(
                                      event.target.value
                                        .split(/[,\s]+/)
                                        .map((entry) => entry.trim())
                                        .filter(Boolean)
                                    )
                                  }
                                  onBlur={() => void commitEditing()}
                                  placeholder="user-id-1, user-id-2"
                                  aria-label={`Edit ${column}`}
                                />
                              ) : (
                                <Input
                                  autoFocus
                                  value={typeof draftValue === "string" ? draftValue : ""}
                                  onChange={(event) => setDraftValue(event.target.value)}
                                  onBlur={() => void commitEditing()}
                                  onKeyDown={handleKeyDown}
                                  aria-label={`Edit ${column}`}
                                />
                              )}
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={isSaving}
                                onMouseDown={(event) => event.preventDefault()}
                                onClick={() => void commitEditing()}
                              >
                                {isSaving ? "Saving…" : "Save"}
                              </Button>
                            </div>
                          ) : (
                            <div
                              className={cn(
                                "cursor-text rounded-sm px-1 py-0.5",
                                "focus:outline-none focus:ring-2 focus:ring-primary/60"
                              )}
                              role="textbox"
                              tabIndex={0}
                              onFocus={() => beginEditing(virtualRow.index, column, value)}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  beginEditing(virtualRow.index, column, value);
                                }
                              }}
                            >
                              {(() => {
                                if (isAssigneeField(column) && Array.isArray(value)) {
                                  return value
                                    .map((entry) => {
                                      if (typeof entry === "string") return entry;
                                      if (entry && typeof entry === "object") {
                                        if ("name" in entry && typeof entry.name === "string") {
                                          return entry.name;
                                        }
                                        if (
                                          "full_name" in entry &&
                                          typeof (entry as { full_name?: unknown }).full_name === "string"
                                        ) {
                                          return (entry as { full_name: string }).full_name;
                                        }
                                        if (
                                          "user_id" in entry &&
                                          typeof (entry as { user_id?: unknown }).user_id === "string"
                                        ) {
                                          return (entry as { user_id: string }).user_id;
                                        }
                                      }
                                      return null;
                                    })
                                    .filter(Boolean)
                                    .join(", ");
                                }

                                const display = toDisplayValue(value);
                                return display || <span className="text-muted-foreground">Empty</span>;
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          {hasMore ? (
            <div className="px-3 py-2 text-center text-xs text-muted-foreground">
              {isLoadingMore ? "Loading more…" : "Scroll to load additional rows"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
