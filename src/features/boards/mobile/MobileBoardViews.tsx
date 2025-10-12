import { useCallback, useMemo } from "react";
import {
  BadgeCheck,
  CalendarDays,
  ChartBar,
  ChevronDown,
  ChevronUp,
  FileText,
  Image,
  LayoutGrid,
  Loader2,
  Rows3,
  Sparkle,
  Users,
} from "lucide-react";
import { eachDayOfInterval, endOfWeek, format, isSameDay, startOfWeek } from "date-fns";

import { useBoardViewContext } from "../views/context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useProfilePreferencesScope } from "@/state/profile";

const DEFAULT_DATE_FIELDS = ["due_date", "start_date", "end_date", "date"];
const STICKY_FIELDS = ["title", "name", "status", "assignee", "owner"];

const randomId = () =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const toItemId = (record: Record<string, unknown>): string => {
  const candidate = record.id ?? record.uuid ?? record.key;
  return typeof candidate === "string" || typeof candidate === "number" ? String(candidate) : randomId();
};

const toDisplayValue = (value: unknown): string => {
  if (value == null) return "—";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
};

const deriveColumns = (items: Record<string, unknown>[]) => {
  const columns = new Set<string>();
  for (const item of items.slice(0, 20)) {
    Object.keys(item).forEach((key) => {
      if (key.startsWith("__") || key === "id" || key === "uuid") return;
      columns.add(key);
    });
  }
  return Array.from(columns);
};

const deriveDateField = (items: Record<string, unknown>[]) => {
  for (const field of DEFAULT_DATE_FIELDS) {
    const hasValue = items.some((item) => item[field]);
    if (hasValue) return field;
  }
  return DEFAULT_DATE_FIELDS[0];
};

const deriveStatusField = (items: Record<string, unknown>[]) => {
  const candidates = ["status", "state", "stage"];
  return candidates.find((field) => items.some((item) => typeof item[field] === "string")) ?? "status";
};

const deriveAssigneeField = (items: Record<string, unknown>[]) => {
  const candidates = ["assignee", "owner", "responsible", "assigned_to"];
  return candidates.find((field) => items.some((item) => item[field])) ?? "assignee";
};

const toDate = (value: unknown): Date | null => {
  if (!value) return null;
  if (value instanceof Date) return value;
  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? null : new Date(parsed);
};

const sortStatuses = (statuses: string[]) => {
  const priority = ["backlog", "todo", "ready", "in progress", "in_review", "review", "blocked", "done", "complete"];
  return [...statuses].sort((a, b) => {
    const ai = priority.findIndex((value) => a.toLowerCase().includes(value));
    const bi = priority.findIndex((value) => b.toLowerCase().includes(value));
    return (ai === -1 ? priority.length : ai) - (bi === -1 ? priority.length : bi);
  });
};

interface ColumnToggleProps {
  columns: string[];
  visible: string[];
  onToggle: (column: string) => void;
}

function ColumnToggle({ columns, visible, onToggle }: ColumnToggleProps) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Rows3 className="h-4 w-4" /> Columns
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] bg-background">
        <SheetHeader>
          <SheetTitle>Visible columns</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-2">
          {columns.map((column) => {
            const checked = visible.includes(column);
            return (
              <label key={column} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
                <span className="text-sm font-medium capitalize">{column.replace(/_/g, " ")}</span>
                <Checkbox checked={checked} onCheckedChange={() => onToggle(column)} />
              </label>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface PreferenceScopedProps {
  scope?: string;
}

export function MobileTableView({ scope = "global" }: PreferenceScopedProps) {
  const { items } = useBoardViewContext();
  const columns = useMemo(() => deriveColumns(items), [items]);
  const defaultColumns = useMemo(() => {
    const sticky = columns.filter((column) => STICKY_FIELDS.includes(column));
    const extras = columns.filter((column) => !STICKY_FIELDS.includes(column)).slice(0, 4);
    return sticky.length ? Array.from(new Set([...sticky, ...extras])) : columns.slice(0, 5);
  }, [columns]);
  const { viewSettings, updateViewSettings } = useProfilePreferencesScope(scope);
  const visibleColumns = useMemo(() => {
    const stored = viewSettings.table?.visibleColumns?.filter((column) => columns.includes(column));
    if (stored && stored.length > 0) {
      return stored;
    }
    return defaultColumns;
  }, [viewSettings.table?.visibleColumns, defaultColumns, columns]);

  const toggleColumn = useCallback(
    (column: string) => {
      const hasColumn = visibleColumns.includes(column);
      const candidate = hasColumn
        ? visibleColumns.filter((entry) => entry !== column)
        : [...visibleColumns, column];
      const next = candidate.filter((entry) => columns.includes(entry));
      void updateViewSettings({ table: { visibleColumns: next } });
    },
    [visibleColumns, updateViewSettings, columns]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <LayoutGrid className="h-5 w-5 text-primary" /> Table view
        </CardTitle>
        <ColumnToggle columns={columns} visible={visibleColumns} onToggle={toggleColumn} />
      </CardHeader>
      <CardContent className="overflow-hidden">
        <ScrollArea className="max-h-[70vh] rounded-lg border border-border/60">
          <table className="min-w-full divide-y divide-border/70 text-sm">
            <thead className="bg-muted/50">
              <tr>
                {visibleColumns.map((column, index) => (
                  <th
                    key={column}
                    scope="col"
                    className={cn(
                      "whitespace-nowrap px-3 py-2 text-left font-semibold capitalize text-muted-foreground",
                      index === 0 && "sticky left-0 z-10 bg-muted/70 backdrop-blur"
                    )}
                  >
                    {column.replace(/_/g, " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 bg-background">
              {items.map((item) => {
                const id = toItemId(item);
                return (
                  <tr key={id} className="hover:bg-muted/40">
                    {visibleColumns.map((column, index) => (
                      <td
                        key={`${id}-${column}`}
                        className={cn(
                          "px-3 py-2 text-sm",
                          index === 0 && "sticky left-0 z-0 bg-background/95 font-medium text-foreground"
                        )}
                      >
                        {toDisplayValue(item[column])}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function buildEventBuckets(items: Record<string, unknown>[], dateField: string) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const events = items
    .map((item) => {
      const date = toDate(item[dateField]);
      if (!date) return null;
      return { id: toItemId(item), title: String(item.title ?? item.name ?? "Untitled"), date, raw: item };
    })
    .filter((value): value is { id: string; title: string; date: Date; raw: Record<string, unknown> } => Boolean(value));

  const bucket = new Map<number, typeof events>();
  for (const day of days) {
    bucket.set(day.getTime(), []);
  }

  for (const event of events) {
    const key = days.find((day) => isSameDay(day, event.date))?.getTime();
    if (key != null) {
      bucket.get(key)?.push(event);
    }
  }

  return { days, bucket };
}

export function MobileCalendarBoardView({ scope = "global" }: PreferenceScopedProps) {
  const { items } = useBoardViewContext();
  const dateField = useMemo(() => deriveDateField(items), [items]);
  const { viewSettings, updateViewSettings } = useProfilePreferencesScope(scope);
  const mode =
    (viewSettings.calendar?.mode as "agenda" | "week" | "day" | undefined) ?? "week";
  const handleModeChange = useCallback(
    (nextMode: "agenda" | "week" | "day") => {
      if (nextMode === mode) return;
      void updateViewSettings({ calendar: { mode: nextMode } });
    },
    [mode, updateViewSettings]
  );
  const { days, bucket } = useMemo(() => buildEventBuckets(items, dateField), [items, dateField]);
  const today = new Date();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <CalendarDays className="h-5 w-5 text-primary" /> Calendar ({mode})
        </CardTitle>
        <Tabs
          value={mode}
          onValueChange={(value) => handleModeChange(value as "agenda" | "week" | "day")}
        >
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[70vh]">
          {mode === "agenda" ? (
            <div className="space-y-4">
              {items.map((item) => {
                const date = toDate(item[dateField]);
                if (!date) return null;
                return (
                  <div key={toItemId(item)} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">{item.title ?? item.name ?? "Untitled"}</span>
                      <Badge variant={isSameDay(date, today) ? "default" : "secondary"}>{format(date, "MMM d")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{toDisplayValue(item.description ?? item.status)}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={cn("grid gap-4", mode === "day" ? "grid-cols-1" : "grid-cols-2")}>
              {days.map((day) => {
                const events = bucket.get(day.getTime()) ?? [];
                if (mode === "day" && !isSameDay(day, today)) return null;
                return (
                  <div key={day.toISOString()} className="rounded-lg border border-border/60 p-3">
                    <div className="mb-2 flex items-center justify-between text-sm font-semibold">
                      <span>{format(day, "EEE, MMM d")}</span>
                      <Badge variant={isSameDay(day, today) ? "default" : "outline"}>{events.length} events</Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      {events.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No events scheduled.</p>
                      ) : (
                        events.map((event) => (
                          <div key={event.id} className="rounded-md border border-border/70 bg-muted/40 px-3 py-2">
                            <p className="font-medium text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {toDisplayValue(event.raw.status ?? event.raw.assignee ?? "")}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function MobileBacklogView() {
  const { items, replaceItems } = useBoardViewContext();
  const statusField = useMemo(() => deriveStatusField(items), [items]);
  const grouped = useMemo(() => {
    const map = new Map<string, Record<string, unknown>[]>();
    for (const item of items) {
      const status = String(item[statusField] ?? "Backlog");
      const bucket = map.get(status) ?? [];
      bucket.push(item);
      map.set(status, bucket);
    }
    return map;
  }, [items, statusField]);

  const statuses = useMemo(() => sortStatuses(Array.from(grouped.keys())), [grouped]);

  const moveItem = useCallback(
    (status: string, index: number, direction: -1 | 1) => {
      const bucket = grouped.get(status);
      if (!bucket) return;
      const targetIndex = index + direction;
      if (targetIndex < 0 || targetIndex >= bucket.length) return;
      const nextBucket = [...bucket];
      const [item] = nextBucket.splice(index, 1);
      nextBucket.splice(targetIndex, 0, item);
      const nextItems: Record<string, unknown>[] = [];
      for (const currentStatus of statuses) {
        const currentBucket =
          currentStatus === status ? nextBucket : [...(grouped.get(currentStatus) ?? [])];
        nextItems.push(...currentBucket);
      }
      replaceItems(nextItems);
    },
    [grouped, replaceItems, statuses]
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Rows3 className="h-5 w-5 text-primary" /> Backlog priorities
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {statuses.map((status) => {
          const bucket = grouped.get(status) ?? [];
          return (
            <section key={status} className="rounded-xl border border-border/70 bg-muted/30 p-3">
              <header className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold capitalize text-muted-foreground">{status}</h3>
                <Badge variant="secondary">{bucket.length}</Badge>
              </header>
              <div className="space-y-2">
                {bucket.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No items queued.</p>
                ) : (
                  bucket.map((item, index) => (
                    <div key={toItemId(item)} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {item.title ?? item.name ?? "Untitled"}
                        </span>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => moveItem(status, index, -1)}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => moveItem(status, index, 1)}
                            disabled={index === bucket.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {toDisplayValue(item.description ?? item.assignee ?? "")}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function MobileSprintView() {
  const { items } = useBoardViewContext();
  const statusField = useMemo(() => deriveStatusField(items), [items]);
  const assigneeField = useMemo(() => deriveAssigneeField(items), [items]);

  const metrics = useMemo(() => {
    const totals: Record<string, { count: number; assignees: Set<string> }> = {};
    for (const item of items) {
      const status = String(item[statusField] ?? "Backlog");
      const assignee = String(item[assigneeField] ?? "Unassigned");
      const record = totals[status] ?? { count: 0, assignees: new Set<string>() };
      record.count += 1;
      record.assignees.add(assignee);
      totals[status] = record;
    }
    return totals;
  }, [assigneeField, items, statusField]);

  const statuses = useMemo(() => sortStatuses(Object.keys(metrics)), [metrics]);
  const total = items.length || 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <BadgeCheck className="h-5 w-5 text-primary" /> Sprint health
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {statuses.map((status) => {
          const entry = metrics[status];
          const completion = Math.round((entry.count / total) * 100);
          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center justify-between text-sm font-medium">
                <span className="capitalize text-muted-foreground">{status}</span>
                <span>{entry.count} • {completion}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${completion}%` }} />
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                {Array.from(entry.assignees).map((assignee) => (
                  <Badge key={`${status}-${assignee}`} variant="outline">
                    {assignee}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

export function MobileFilesView() {
  const { items } = useBoardViewContext();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileText className="h-5 w-5 text-primary" /> Files
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <div key={toItemId(item)} className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/40 p-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-md bg-background shadow-inner">
                <FileText className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{item.title ?? item.name ?? "Untitled asset"}</p>
                <p className="truncate text-xs text-muted-foreground">{toDisplayValue(item.type ?? item.status ?? "Draft")}</p>
              </div>
              <Badge variant="secondary">{toDisplayValue(item.owner ?? item.assignee ?? "")}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MobileGalleryView() {
  const { items } = useBoardViewContext();
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Image className="h-5 w-5 text-primary" /> Gallery
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <article key={toItemId(item)} className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
              <div className="h-32 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5" />
              <div className="space-y-2 p-3">
                <h3 className="text-sm font-semibold text-foreground">{item.title ?? item.name ?? "Untitled"}</h3>
                <p className="text-xs text-muted-foreground">{toDisplayValue(item.description ?? item.status ?? "")}</p>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{toDisplayValue(item.assignee ?? "Unassigned")}</span>
                  <span>{toDisplayValue(item.due_date ?? item.updated_at ?? "")}</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MobileWorkloadView() {
  const { items } = useBoardViewContext();
  const assigneeField = useMemo(() => deriveAssigneeField(items), [items]);

  const workloads = useMemo(() => {
    const map = new Map<string, { count: number; statuses: Map<string, number> }>();
    for (const item of items) {
      const assignee = String(item[assigneeField] ?? "Unassigned");
      const status = String(item.status ?? item.state ?? "Unknown");
      const record = map.get(assignee) ?? { count: 0, statuses: new Map<string, number>() };
      record.count += 1;
      record.statuses.set(status, (record.statuses.get(status) ?? 0) + 1);
      map.set(assignee, record);
    }
    return map;
  }, [assigneeField, items]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" /> Workload
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from(workloads.entries()).map(([assignee, data]) => (
          <div key={assignee} className="rounded-lg border border-border/70 bg-muted/30 p-3">
            <div className="flex items-center justify-between text-sm font-medium">
              <span>{assignee}</span>
              <Badge variant="secondary">{data.count} items</Badge>
            </div>
            <div className="mt-3 space-y-1 text-xs text-muted-foreground">
              {Array.from(data.statuses.entries()).map(([status, count]) => (
                <div key={status} className="flex items-center justify-between">
                  <span className="capitalize">{status}</span>
                  <span>{count}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

const NOTE_COLORS = ["#fef08a", "#bfdbfe", "#fbcfe8", "#bbf7d0", "#fde68a"];

type WhiteboardNode = {
  id: string;
  text: string;
  color: string;
};

export function MobileWhiteboardView({ scope = "global" }: PreferenceScopedProps) {
  const { viewSettings, updateViewSettings } = useProfilePreferencesScope(scope);
  const notes = useMemo<WhiteboardNode[]>(() => {
    const stored = viewSettings.whiteboard?.notes;
    if (!Array.isArray(stored)) return [];
    return stored
      .filter((note): note is WhiteboardNode =>
        Boolean(note && typeof note.id === "string" && typeof note.color === "string")
      )
      .map((note) => ({ id: note.id, text: note.text ?? "", color: note.color ?? NOTE_COLORS[0] }));
  }, [viewSettings.whiteboard?.notes]);

  const commitNotes = useCallback(
    (next: WhiteboardNode[]) => {
      void updateViewSettings({ whiteboard: { notes: next.map((note) => ({ ...note })) } });
    },
    [updateViewSettings]
  );

  const addNote = useCallback(() => {
    const color = NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)];
    const id =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : randomId();
    commitNotes([...notes, { id, text: "Tap to edit", color }]);
  }, [notes, commitNotes]);

  const updateNote = useCallback(
    (id: string, text: string) => {
      commitNotes(notes.map((note) => (note.id === id ? { ...note, text } : note)));
    },
    [notes, commitNotes]
  );

  const removeNote = useCallback(
    (id: string) => {
      commitNotes(notes.filter((note) => note.id !== id));
    },
    [notes, commitNotes]
  );

  return (
    <Card>
      <CardHeader className="flex items-center justify-between">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkle className="h-5 w-5 text-primary" /> Whiteboard
        </CardTitle>
        <Button size="sm" onClick={addNote}>
          Add sticky
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {notes.length === 0 ? (
            <p className="col-span-2 text-sm text-muted-foreground">
              No whiteboard notes yet. Use the button above to capture ideas offline.
            </p>
          ) : (
            notes.map((note) => (
              <div key={note.id} className="relative rounded-lg p-3 shadow" style={{ backgroundColor: note.color }}>
                <textarea
                  className="h-24 w-full resize-none bg-transparent text-sm focus:outline-none"
                  value={note.text}
                  onChange={(event) => updateNote(note.id, event.target.value)}
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute right-1 top-1 h-6 w-6 text-muted-foreground"
                  onClick={() => removeNote(note.id)}
                >
                  ×
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function MobilePivotView() {
  const { items } = useBoardViewContext();
  const statusField = useMemo(() => deriveStatusField(items), [items]);
  const assigneeField = useMemo(() => deriveAssigneeField(items), [items]);

  const pivot = useMemo(() => {
    const statuses = new Set<string>();
    const assignees = new Set<string>();
    const matrix = new Map<string, Map<string, number>>();

    for (const item of items) {
      const status = String(item[statusField] ?? "Unknown");
      const assignee = String(item[assigneeField] ?? "Unassigned");
      statuses.add(status);
      assignees.add(assignee);
      const row = matrix.get(assignee) ?? new Map<string, number>();
      row.set(status, (row.get(status) ?? 0) + 1);
      matrix.set(assignee, row);
    }

    return { statuses: Array.from(statuses), assignees: Array.from(assignees), matrix };
  }, [assigneeField, items, statusField]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ChartBar className="h-5 w-5 text-primary" /> Pivot
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-full table-fixed border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-40 border-b border-border/60 px-3 py-2 text-left text-xs uppercase text-muted-foreground">
                Assignee
              </th>
              {pivot.statuses.map((status) => (
                <th key={status} className="border-b border-border/60 px-3 py-2 text-left text-xs uppercase text-muted-foreground">
                  {status}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pivot.assignees.map((assignee) => {
              const row = pivot.matrix.get(assignee) ?? new Map<string, number>();
              return (
                <tr key={assignee} className="border-b border-border/40">
                  <td className="px-3 py-2 text-sm font-medium text-foreground">{assignee}</td>
                  {pivot.statuses.map((status) => (
                    <td key={`${assignee}-${status}`} className="px-3 py-2 text-center text-sm">
                      {row.get(status) ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export function MobileGanttView() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Loader2 className="h-5 w-5 text-primary" /> Gantt (compact)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The mobile Gantt view reuses the timeline pinch and zoom interactions. Switch to the timeline view for full controls.
        </p>
      </CardContent>
    </Card>
  );
}
