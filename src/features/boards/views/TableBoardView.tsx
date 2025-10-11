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
import { useBoardState } from "./BoardStateProvider";

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

const REQUIRED_FIELD_PATTERNS = [/title/i, /name/i];

const toSnakeCase = (value: string) =>
  value
    .replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
    .replace(/\s+/g, "_")
    .toLowerCase();

const toDraftFromValue = (value: unknown, mode: EditingCell["mode"]): DraftValue => {
  if (mode === "assignees") {
    return normalizeAssigneeDraft(
      Array.isArray(value)
        ? value.map((entry) =>
            typeof entry === "string"
              ? entry
              : entry && typeof entry === "object" && "id" in entry && typeof (entry as { id?: unknown }).id === "string"
                ? (entry as { id: string }).id
                : toDisplayValue(entry)
          )
        : toDisplayValue(value)
    );
  }

  if (mode === "date" && typeof value === "string") {
    return value.slice(0, 10);
  }

  return typeof value === "string" ? value : toDisplayValue(value);
};

const normalizeDraftForMode = (value: DraftValue, mode: EditingCell["mode"]): DraftValue => {
  if (mode === "assignees") {
    return normalizeAssigneeDraft(value);
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  return value;
};

interface BoardChangeDescriptor {
  column: string;
  mode: EditingCell["mode"];
  rowIndex: number;
  recordId: string;
  optimisticValue: unknown;
  patch?: TaskUpdateInput;
  assigneeIds?: string[];
}

type ConflictDetails = {
  remote: Record<string, unknown>;
  column?: string;
  message?: string;
};

const buildChangeDescriptor = ({
  column,
  mode,
  rowIndex,
  recordId,
  draft,
}: {
  column: string;
  mode: EditingCell["mode"];
  rowIndex: number;
  recordId: string;
  draft: DraftValue;
}): BoardChangeDescriptor => {
  if (mode === "assignees") {
    const ids = normalizeAssigneeDraft(draft);
    return {
      column,
      mode,
      rowIndex,
      recordId,
      optimisticValue: ids,
      assigneeIds: ids,
    };
  }

  const stringValue = typeof draft === "string" ? draft : Array.isArray(draft) ? draft.join(", ") : "";
  if (mode === "date") {
    return {
      column,
      mode,
      rowIndex,
      recordId,
      optimisticValue: stringValue,
      patch: {
        [toSnakeCase(column)]: stringValue ? new Date(stringValue).toISOString() : null,
      } as TaskUpdateInput,
    };
  }

  return {
    column,
    mode,
    rowIndex,
    recordId,
    optimisticValue: stringValue,
    patch: {
      [toSnakeCase(column)]: stringValue,
    } as TaskUpdateInput,
  };
};

const validateChange = (
  column: string,
  mode: EditingCell["mode"],
  optimisticValue: unknown,
  row: BoardViewRecord | undefined
) => {
  if (mode !== "assignees" && typeof optimisticValue === "string") {
    if (REQUIRED_FIELD_PATTERNS.some((pattern) => pattern.test(column)) && optimisticValue.trim().length === 0) {
      return `${column} is required.`;
    }
  }

  if (
    mode === "status" &&
    typeof optimisticValue === "string" &&
    optimisticValue === "done" &&
    row &&
    typeof row === "object" &&
    row !== null &&
    "blocked" in row &&
    typeof (row as { blocked?: unknown }).blocked === "boolean" &&
    (row as { blocked?: unknown }).blocked
  ) {
    return "Unblock the record before marking it done.";
  }

  return null;
};

const isPermissionError = (error: unknown) => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("do not have access") || message.includes("permission");
  }
  if (typeof error === "string") {
    const message = error.toLowerCase();
    return message.includes("do not have access") || message.includes("permission");
  }
  return false;
};

const isOfflineError = (error: unknown) => {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return true;
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes("failed to fetch") || message.includes("network") || message.includes("offline");
  }
  return false;
};

const parseConflictError = (error: unknown): ConflictDetails | null => {
  if (!error || typeof error !== "object") {
    return null;
  }

  const maybeRemote = (error as { remote?: unknown }).remote;
  const remoteRecord = maybeRemote && typeof maybeRemote === "object" ? (maybeRemote as Record<string, unknown>) : null;
  const column = typeof (error as { field?: unknown }).field === "string" ? ((error as { field?: unknown }).field as string) : undefined;
  const message = (error as { message?: unknown }).message;

  if (remoteRecord) {
    return { remote: remoteRecord, column, message: typeof message === "string" ? message : undefined };
  }

  if (typeof message === "string" && message.toLowerCase().includes("conflict")) {
    return { remote: {}, column, message };
  }

  return null;
};

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
  const { queueChange, cancelQueuedChange, pushHistory, openConflict } = useBoardState();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState<DraftValue>("");
  const [validationError, setValidationError] = useState<string | null>(null);
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

  const persistDescriptor = useCallback(
    async (descriptor: BoardChangeDescriptor) => {
      if (descriptor.assigneeIds) {
        await replaceTaskAssignees(descriptor.recordId, descriptor.assigneeIds);
        return;
      }

      if (descriptor.patch) {
        await enqueueTaskUpdate({ id: descriptor.recordId, patch: descriptor.patch });
      }
    },
    [enqueueTaskUpdate]
  );

  const showPermissionToast = useCallback(() => {
    toast({
      title: "Permission required",
      description: "You do not have access to update this item.",
      action: {
        label: "Request access",
        onClick: () => window.open?.("/support/access-request", "_blank"),
      },
      variant: "destructive",
    });
  }, [toast]);

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
      setValidationError(null);
      const draft = toDraftFromValue(value, mode);
      setDraftValue(draft);
    },
    []
  );

  const stopEditing = useCallback(() => {
    setEditing(null);
    setDraftValue("");
    setIsSaving(false);
    setValidationError(null);
  }, []);

  const commitEditing = useCallback(async () => {
    if (!editing || isSaving) {
      return;
    }

    const row = itemsRef.current[editing.row];
    const recordId =
      typeof row?.id === "string"
        ? row.id
        : typeof row?.id === "number"
          ? String(row.id)
          : undefined;
    if (!recordId) {
      return;
    }

    const normalizedDraft = normalizeDraftForMode(draftValue, editing.mode);
    const descriptor = buildChangeDescriptor({
      column: editing.column,
      mode: editing.mode,
      rowIndex: editing.row,
      recordId,
      draft: normalizedDraft,
    });
    const originalDraft = normalizeDraftForMode(
      toDraftFromValue(editing.originalValue, editing.mode),
      editing.mode
    );
    const originalDescriptor = buildChangeDescriptor({
      column: editing.column,
      mode: editing.mode,
      rowIndex: editing.row,
      recordId,
      draft: originalDraft,
    });

    const validationMessage = validateChange(
      editing.column,
      editing.mode,
      descriptor.optimisticValue,
      row
    );
    if (validationMessage) {
      setValidationError(validationMessage);
      setEditing((current) => (current ? { ...current } : current));
      return;
    }

    setValidationError(null);
    setIsSaving(true);

    updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });

    try {
      await persistDescriptor(descriptor);
      pushHistory({
        description: `Update ${descriptor.column}`,
        undo: async () => {
          updateItem(originalDescriptor.rowIndex, {
            [originalDescriptor.column]: originalDescriptor.optimisticValue,
          });
          try {
            await persistDescriptor(originalDescriptor);
          } catch (undoError) {
            if (isOfflineError(undoError)) {
              queueChange({
                description: `Revert ${descriptor.column}`,
                retry: async () => {
                  updateItem(originalDescriptor.rowIndex, {
                    [originalDescriptor.column]: originalDescriptor.optimisticValue,
                  });
                  await persistDescriptor(originalDescriptor);
                },
                errorMessage: undoError instanceof Error ? undoError.message : String(undoError),
              });
            } else if (isPermissionError(undoError)) {
              showPermissionToast();
            } else {
              toast({
                title: "Unable to undo change",
                description: undoError instanceof Error ? undoError.message : String(undoError),
                variant: "destructive",
              });
            }
          }
        },
        redo: async () => {
          updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
          try {
            await persistDescriptor(descriptor);
          } catch (redoError) {
            if (isOfflineError(redoError)) {
              queueChange({
                description: `Update ${descriptor.column}`,
                retry: async () => {
                  updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
                  await persistDescriptor(descriptor);
                },
                errorMessage: redoError instanceof Error ? redoError.message : String(redoError),
              });
            } else if (isPermissionError(redoError)) {
              showPermissionToast();
            } else {
              toast({
                title: "Unable to redo change",
                description: redoError instanceof Error ? redoError.message : String(redoError),
                variant: "destructive",
              });
            }
          }
        },
      });
      stopEditing();
    } catch (error) {
      if (isOfflineError(error)) {
        const queuedId = queueChange({
          description: `Update ${descriptor.column}`,
          retry: async () => {
            updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
            await persistDescriptor(descriptor);
          },
          errorMessage: error instanceof Error ? error.message : String(error),
        });

        pushHistory({
          description: `Update ${descriptor.column}`,
          undo: async () => {
            cancelQueuedChange(queuedId);
            updateItem(originalDescriptor.rowIndex, {
              [originalDescriptor.column]: originalDescriptor.optimisticValue,
            });
          },
          redo: async () => {
            updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
            try {
              await persistDescriptor(descriptor);
            } catch (redoError) {
              if (isOfflineError(redoError)) {
                queueChange({
                  description: `Update ${descriptor.column}`,
                  retry: async () => {
                    updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
                    await persistDescriptor(descriptor);
                  },
                  errorMessage: redoError instanceof Error ? redoError.message : String(redoError),
                });
              } else if (isPermissionError(redoError)) {
                showPermissionToast();
              } else {
                toast({
                  title: "Unable to redo change",
                  description: redoError instanceof Error ? redoError.message : String(redoError),
                  variant: "destructive",
                });
              }
            }
          },
        });

        toast({
          title: "Saved offline",
          description: "We'll retry this change when you're back online.",
        });

        stopEditing();
        return;
      }

      const conflict = parseConflictError(error);
      if (conflict) {
        updateItem(editing.row, { [editing.column]: editing.originalValue });
        openConflict({
          id: `conflict-${recordId}`,
          title: "Update conflict",
          message: conflict.message,
          local: { [editing.column]: descriptor.optimisticValue },
          remote: conflict.remote,
          onResolve: async (choice) => {
            if (choice === "local") {
              updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
              try {
                await persistDescriptor(descriptor);
                pushHistory({
                  description: `Update ${descriptor.column}`,
                  undo: async () => {
                    updateItem(originalDescriptor.rowIndex, {
                      [originalDescriptor.column]: originalDescriptor.optimisticValue,
                    });
                    await persistDescriptor(originalDescriptor);
                  },
                  redo: async () => {
                    updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
                    await persistDescriptor(descriptor);
                  },
                });
              } catch (retryError) {
                if (isOfflineError(retryError)) {
                  queueChange({
                    description: `Update ${descriptor.column}`,
                    retry: async () => {
                      updateItem(descriptor.rowIndex, { [descriptor.column]: descriptor.optimisticValue });
                      await persistDescriptor(descriptor);
                    },
                    errorMessage: retryError instanceof Error ? retryError.message : String(retryError),
                  });
                } else if (isPermissionError(retryError)) {
                  showPermissionToast();
                  updateItem(originalDescriptor.rowIndex, {
                    [originalDescriptor.column]: originalDescriptor.optimisticValue,
                  });
                } else {
                  toast({
                    title: "Unable to apply change",
                    description: retryError instanceof Error ? retryError.message : String(retryError),
                    variant: "destructive",
                  });
                  updateItem(originalDescriptor.rowIndex, {
                    [originalDescriptor.column]: originalDescriptor.optimisticValue,
                  });
                }
              }
            } else {
              const key = conflict.column ?? descriptor.column;
              const remoteValue = conflict.remote[key];
              updateItem(descriptor.rowIndex, {
                [descriptor.column]: remoteValue ?? editing.originalValue,
              });
            }
          },
        });
        stopEditing();
        return;
      }

      updateItem(editing.row, { [editing.column]: editing.originalValue });

      if (isPermissionError(error)) {
        showPermissionToast();
      } else {
        toast({
          title: "Unable to save change",
          description: error instanceof Error ? error.message : String(error),
          variant: "destructive",
        });
      }

      stopEditing();
    } finally {
      setIsSaving(false);
    }
  }, [
    cancelQueuedChange,
    draftValue,
    editing,
    isSaving,
    openConflict,
    persistDescriptor,
    pushHistory,
    queueChange,
    showPermissionToast,
    stopEditing,
    toast,
    updateItem,
  ]);

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
                          onClick={() => {
                            if (!isEditing) {
                              beginEditing(virtualRow.index, column, value);
                            }
                          }}
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
                              {validationError ? (
                                <p className="w-full text-xs text-destructive" role="alert">
                                  {validationError}
                                </p>
                              ) : null}
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
