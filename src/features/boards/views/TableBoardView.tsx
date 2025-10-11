import { useCallback, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { replaceTaskAssignees, updateTaskFields, type TaskUpdateInput } from "@/services/tasksService";
import { useBoardViewContext } from "./context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = ["todo", "in_progress", "in_review", "done"] as const;

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

export function TableBoardView() {
  const { items, configuration, updateItem, isLoading } = useBoardViewContext();
  const { toast } = useToast();
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState<DraftValue>("");
  const [isSaving, setIsSaving] = useState(false);

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

    const remaining = allColumns.filter(
      (column) => !ordered.includes(column)
    );

    const fullOrder = [...ordered, ...remaining];

    return fullOrder.filter(
      (column) => !configuration.columnPreferences.hidden.includes(column)
    );
  }, [
    allColumns,
    configuration.columnPreferences.hidden,
    configuration.columnPreferences.order,
  ]);

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
                if ("user_id" in entry && typeof (entry as { user_id?: unknown }).user_id === "string") {
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
      const row = items[cell.row];
      const recordId = typeof row?.id === "string" ? row.id : undefined;
      if (!recordId) {
        return;
      }

      const field = toSnakeCase(cell.column) as keyof TaskUpdateInput;

      if (cell.mode === "assignees") {
        const ids = Array.isArray(value)
          ? value
          : String(value)
              .split(/[,\s]+/)
              .map((entry) => entry.trim())
              .filter(Boolean);

        await replaceTaskAssignees(recordId, ids);
        return;
      }

      let payloadValue: unknown = value;
      if (cell.mode === "date") {
        payloadValue = typeof value === "string" && value ? new Date(value).toISOString() : null;
      }

      await updateTaskFields(recordId, {
        [field]: payloadValue,
      } as TaskUpdateInput);
    },
    [items]
  );

  const commitEditing = useCallback(async () => {
    if (!editing || isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const value = editing.mode === "assignees"
        ? draftValue
        : Array.isArray(draftValue)
        ? draftValue.join(", ")
        : draftValue;

      updateItem(editing.row, { [editing.column]: value });
      await persistChange(editing, draftValue);
      stopEditing();
    } catch (error) {
      updateItem(editing.row, { [editing.column]: editing.originalValue });
      toast({
        title: "Unable to save change",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
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
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] table-fixed border-collapse">
        <thead>
          <tr className="bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            {visibleColumns.map((column) => (
              <th key={column} className="border-b px-3 py-2 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item, rowIndex) => (
            <tr key={rowIndex} className="border-b hover:bg-muted/40">
              {visibleColumns.map((column) => {
                const value = item[column];
                const isEditing = editing?.row === rowIndex && editing.column === column;

                return (
                  <td
                    key={column}
                    className="px-3 py-2 align-top text-sm"
                    onClick={() => beginEditing(rowIndex, column, value)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
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
                        onFocus={() => beginEditing(rowIndex, column, value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault();
                            beginEditing(rowIndex, column, value);
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
                                  if ("full_name" in entry && typeof (entry as { full_name?: unknown }).full_name === "string") {
                                    return (entry as { full_name: string }).full_name;
                                  }
                                  if ("user_id" in entry && typeof (entry as { user_id?: unknown }).user_id === "string") {
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
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

