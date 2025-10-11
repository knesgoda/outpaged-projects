import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useBoardViewContext } from "./context";

interface EditingCell {
  row: number;
  column: string;
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
  const [editing, setEditing] = useState<EditingCell | null>(null);
  const [draftValue, setDraftValue] = useState("");

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

  const beginEditing = (row: number, column: string, value: unknown) => {
    setEditing({ row, column });
    setDraftValue(toDisplayValue(value));
  };

  const stopEditing = () => {
    setEditing(null);
    setDraftValue("");
  };

  const commitEditing = () => {
    if (!editing) {
      return;
    }

    updateItem(editing.row, { [editing.column]: draftValue });
    stopEditing();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      commitEditing();
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
                    onDoubleClick={() => beginEditing(rowIndex, column, value)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <Input
                          autoFocus
                          value={draftValue}
                          onChange={(event) => setDraftValue(event.target.value)}
                          onBlur={commitEditing}
                          onKeyDown={handleKeyDown}
                          aria-label={`Edit ${column}`}
                        />
                        <Button
                          size="sm"
                          variant="secondary"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={commitEditing}
                        >
                          Save
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
                        {toDisplayValue(value) || <span className="text-muted-foreground">Empty</span>}
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

