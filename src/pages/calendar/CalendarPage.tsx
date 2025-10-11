import { useCallback, useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  addDays,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  endOfQuarter,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
} from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useCalendarRange, type CalendarTask } from "@/hooks/useCalendar";
import { DateRangeControls, type CalendarUnit, type DateRange } from "@/components/common/DateRangeControls";
import { ViewSwitch, type CalendarView } from "@/components/common/ViewSwitch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  Filter,
  Globe2,
  Layers,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarProvider, useCalendarState } from "@/state/calendar";
import type { CalendarLayer, CalendarSavedView } from "@/types/calendar";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };
const MAX_VISIBLE_TASKS = 3;

interface ProjectOption {
  id: string;
  name: string | null;
}

interface SaveViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: { name: string; description?: string }) => void;
  calendars: CalendarLayer[];
}

function SaveViewDialog({ open, onOpenChange, onSubmit, calendars }: SaveViewDialogProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const visibleCalendars = calendars.filter((calendar) => calendar.visible && calendar.subscribed);

  const handleSubmit = () => {
    if (!name.trim()) {
      return;
    }
    onSubmit({ name: name.trim(), description: description.trim() || undefined });
    setName("");
    setDescription("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Save current calendar view</DialogTitle>
          <DialogDescription>
            Store the active calendar selection and filters for quick reuse.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="view-name">View name</Label>
            <Input
              id="view-name"
              placeholder="e.g. Release readiness"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="view-description">Description</Label>
            <Textarea
              id="view-description"
              placeholder="Optional details for teammates"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>
          <div className="rounded-md border bg-muted/30 p-3 text-sm">
            <p className="font-medium">Calendars captured</p>
            <ul className="mt-2 space-y-1">
              {visibleCalendars.map((calendar) => (
                <li key={calendar.id} className="flex items-center gap-2">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: calendar.color }}
                    aria-hidden="true"
                  />
                  <span>{calendar.name}</span>
                </li>
              ))}
              {visibleCalendars.length === 0 && (
                <li className="text-muted-foreground">No calendars visible.</li>
              )}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!name.trim()}>
            <Save className="mr-2 h-4 w-4" />Save view
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function useProjectsList() {
  return useQuery({
    queryKey: ["calendar", "projects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("id, name");
      if (error) {
        throw error;
      }
      return (data ?? []) as ProjectOption[];
    },
  });
}

function getRangeForView(view: CalendarView, pivot: Date): DateRange {
  switch (view) {
    case "day":
      return { from: startOfDay(pivot), to: endOfDay(pivot) };
    case "work-week": {
      const start = startOfWeek(pivot, WEEK_OPTIONS);
      const end = addDays(start, 4);
      return { from: start, to: end };
    }
    case "week":
      return {
        from: startOfWeek(pivot, WEEK_OPTIONS),
        to: endOfWeek(pivot, WEEK_OPTIONS),
      };
    case "quarter":
      return { from: startOfQuarter(pivot), to: endOfQuarter(pivot) };
    case "year":
      return { from: startOfYear(pivot), to: endOfYear(pivot) };
    case "timeline": {
      const start = startOfMonth(pivot);
      const end = endOfMonth(pivot);
      return { from: start, to: end };
    }
    case "agenda": {
      const start = startOfDay(pivot);
      const end = endOfWeek(pivot, WEEK_OPTIONS);
      return { from: start, to: end };
    }
    case "gantt":
    case "month":
    default:
      return {
        from: startOfMonth(pivot),
        to: endOfMonth(pivot),
      };
  }
}

function formatHeaderLabel(view: CalendarView, range: DateRange) {
  switch (view) {
    case "day":
      return format(range.from, "EEEE, MMM d");
    case "work-week":
    case "week":
      return `${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    case "quarter":
      return format(range.from, "'Q'q yyyy");
    case "year":
      return format(range.from, "yyyy");
    case "timeline":
    case "gantt":
      return `${format(range.from, "MMM d, yyyy")} – ${format(range.to, "MMM d, yyyy")}`;
    case "agenda":
      return `Upcoming • ${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    case "month":
    default:
      return format(range.from, "MMMM yyyy");
  }
}

function normalizeTaskInterval(task: CalendarTask) {
  const start = task.start_date ? startOfDay(parseISO(task.start_date)) : null;
  const due = task.due_date ? endOfDay(parseISO(task.due_date)) : null;

  if (!start && !due) return null;

  if (start && due) {
    if (start <= due) {
      return { start, end: due };
    }
    return { start: due, end: endOfDay(start) };
  }

  if (start && !due) {
    return { start, end: endOfDay(start) };
  }

  if (!start && due) {
    const normalized = startOfDay(due);
    return { start: normalized, end: endOfDay(due) };
  }

  return null;
}

function getDayKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function buildTasksByDay(tasks: CalendarTask[]) {
  const map = new Map<string, CalendarTask[]>();
  tasks.forEach((task) => {
    const interval = normalizeTaskInterval(task);
    if (!interval) return;
    const days = eachDayOfInterval({ start: interval.start, end: interval.end });
    days.forEach((day) => {
      const key = getDayKey(day);
      const existing = map.get(key);
      if (existing) {
        existing.push(task);
      } else {
        map.set(key, [task]);
      }
    });
  });
  return map;
}

function CalendarSkeleton() {
  return (
    <div className="grid gap-px rounded-lg border bg-border">
      {Array.from({ length: 6 }).map((_, weekIndex) => (
        <div key={weekIndex} className="grid grid-cols-7 gap-px">
          {Array.from({ length: 7 }).map((__, dayIndex) => (
            <div key={`${weekIndex}-${dayIndex}`} className="h-24 w-full animate-pulse rounded-sm bg-muted" />
          ))}
        </div>
      ))}
    </div>
  );
}

function CalendarEmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-48 flex-col items-center justify-center rounded-md border border-dashed text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

interface DayTasksDrawerProps {
  date: Date | null;
  tasks: CalendarTask[];
  open: boolean;
  onClose: () => void;
  onSelectTask: (task: CalendarTask) => void;
  getProjectName: (projectId: string) => string;
}

function DayTasksDrawer({ date, tasks, open, onClose, onSelectTask, getProjectName }: DayTasksDrawerProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{date ? format(date, "EEEE, MMM d") : "Tasks"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tasks scheduled.</p>
          ) : (
            tasks.map((task) => (
              <button
                key={task.id}
                type="button"
                onClick={() => onSelectTask(task)}
                className="w-full rounded-md border bg-background p-3 text-left transition hover:border-primary"
              >
                <p className="font-medium">{task.title}</p>
                <p className="text-xs text-muted-foreground">{getProjectName(task.project_id)}</p>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface EventDetailPanelProps {
  task: CalendarTask | null;
  calendar: CalendarLayer | null;
  projectName?: string;
  onClose: () => void;
}

function EventDetailPanel({ task, calendar, projectName, onClose }: EventDetailPanelProps) {
  const interval = task ? normalizeTaskInterval(task) : null;
  return (
    <aside
      className={cn(
        "hidden w-80 flex-col border-l bg-card transition-all xl:flex",
        task ? "opacity-100" : "opacity-80"
      )}
    >
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <p className="text-xs text-muted-foreground">Event details</p>
          <h2 className="text-lg font-semibold">{task?.title ?? "Select an event"}</h2>
        </div>
        {task ? (
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close details">
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <ScrollArea className="flex-1 px-4 py-4">
        {task ? (
          <div className="space-y-6 text-sm">
            <div className="space-y-2">
              <p className="text-muted-foreground">Calendar</p>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: calendar?.color ?? "var(--primary)" }}
                  aria-hidden="true"
                />
                <span>{calendar?.name ?? "Unknown"}</span>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Project</p>
              <p>{projectName ?? task.project_id}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-muted-foreground">Start</p>
                <p className="font-medium">
                  {interval?.start ? format(interval.start, "MMM d, yyyy HH:mm") : "TBD"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">End</p>
                <p className="font-medium">
                  {interval?.end ? format(interval.end, "MMM d, yyyy HH:mm") : "TBD"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Status</p>
              <Badge variant="secondary" className="capitalize">
                {task.status ?? "unspecified"}
              </Badge>
            </div>
            <div className="space-y-2">
              <p className="text-muted-foreground">Assignee</p>
              <p>{task.assignee ?? "Unassigned"}</p>
            </div>
            <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
              Inline editing, reminders, and linked items will appear here in upcoming phases.
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
            Select an event in the calendar to inspect its details.
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}

interface CalendarLeftRailProps {
  calendars: CalendarLayer[];
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
  onToggleVisibility: (calendarId: string) => void;
  onColorChange: (calendarId: string, color: string) => void;
  onSubscribe: (calendarId: string) => void;
  onUnsubscribe: (calendarId: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
}

function groupCalendars(calendars: CalendarLayer[]) {
  return calendars.reduce<Record<string, CalendarLayer[]>>((acc, calendar) => {
    const bucket = acc[calendar.type] ?? [];
    bucket.push(calendar);
    acc[calendar.type] = bucket;
    return acc;
  }, {});
}

function CalendarLeftRail({
  calendars,
  loading,
  error,
  onRefresh,
  onToggleVisibility,
  onColorChange,
  onSubscribe,
  onUnsubscribe,
  statusFilter,
  onStatusFilterChange,
}: CalendarLeftRailProps) {
  const [filter, setFilter] = useState("");
  const grouped = groupCalendars(
    calendars.filter((calendar) => calendar.name.toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/10 px-4 py-6 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendars</h2>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Quick add
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        <Input
          placeholder="Filter calendars"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter calendar list"
        />
        <div className="space-y-2 text-sm">
          <Label className="text-xs uppercase text-muted-foreground">Status filter</Label>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="confirmed">Confirmed</SelectItem>
              <SelectItem value="tentative">Tentative</SelectItem>
              <SelectItem value="milestone">Milestones</SelectItem>
              <SelectItem value="busy">Focus blocks</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="mt-6 flex-1 pr-4">
        {loading ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Loading calendars…</p>
          </div>
        ) : error ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />Failed to load calendars.
            </p>
            <Button variant="outline" size="sm" onClick={onRefresh}>
              <RefreshCw className="mr-2 h-4 w-4" />Retry
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([type, items]) => (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
                  {type === "personal" && <Layers className="h-3.5 w-3.5" />}
                  {type === "team" && <Users className="h-3.5 w-3.5" />}
                  {type === "project" && <Filter className="h-3.5 w-3.5" />}
                  {type === "workspace" && <Globe2 className="h-3.5 w-3.5" />}
                  {type === "external" && <CalendarDays className="h-3.5 w-3.5" />}
                  <span>{type}</span>
                </div>
                <div className="space-y-3">
                  {items.map((calendar) => (
                    <div key={calendar.id} className="rounded-md border bg-background p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: calendar.color }}
                            aria-hidden="true"
                          />
                          <span className="font-medium">{calendar.name}</span>
                        </div>
                        {calendar.subscribed ? (
                          <Switch
                            checked={calendar.visible}
                            onCheckedChange={() => onToggleVisibility(calendar.id)}
                            aria-label={`Toggle ${calendar.name}`}
                          />
                        ) : (
                          <Button size="sm" variant="secondary" onClick={() => onSubscribe(calendar.id)}>
                            Follow
                          </Button>
                        )}
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{calendar.description}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Palette className="h-3 w-3" />
                          <input
                            type="color"
                            value={calendar.color}
                            onChange={(event) => onColorChange(calendar.id, event.target.value)}
                            aria-label={`Set color for ${calendar.name}`}
                            className="h-6 w-6 cursor-pointer rounded border"
                            disabled={calendar.isReadOnly}
                          />
                        </div>
                        <span>Timezone: {calendar.timezone ?? "Auto"}</span>
                        {calendar.subscribed ? (
                          <button
                            type="button"
                            className="underline-offset-2 hover:underline"
                            onClick={() => onUnsubscribe(calendar.id)}
                          >
                            Unfollow
                          </button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      <div className="mt-6 space-y-3 text-xs text-muted-foreground">
        <Separator />
        <p className="font-semibold text-foreground">Legend</p>
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />Confirmed
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-muted" />Tentative
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-500" />Milestone
          </div>
        </div>
      </div>
    </aside>
  );
}

interface CalendarTopBarProps {
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  range: DateRange;
  unit: CalendarUnit;
  onRangeChange: (range: DateRange) => void;
  headerLabel: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  projects: ProjectOption[];
  selectedProject?: string;
  onProjectChange: (value: string | undefined) => void;
  density: string;
  onDensityChange: (density: string) => void;
  savedViews: CalendarSavedView[];
  activeSavedViewId: string | null;
  onSelectSavedView: (viewId: string | null) => void;
  onOpenSaveDialog: () => void;
  onRefresh: () => void;
}

function CalendarTopBar({
  view,
  onViewChange,
  range,
  unit,
  onRangeChange,
  headerLabel,
  searchTerm,
  onSearchChange,
  projects,
  selectedProject,
  onProjectChange,
  density,
  onDensityChange,
  savedViews,
  activeSavedViewId,
  onSelectSavedView,
  onOpenSaveDialog,
  onRefresh,
}: CalendarTopBarProps) {
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  return (
    <div className="flex flex-col gap-4 border-b bg-background/95 px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/">Home</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Calendar</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <h1 className="text-3xl font-semibold tracking-tight">Calendar</h1>
          <p className="text-sm text-muted-foreground">
            Coordinate every timeline, milestone, and meeting from one hub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onOpenSaveDialog}>
            <Save className="mr-2 h-4 w-4" />Save view
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />Add event
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ViewSwitch value={view} onChange={onViewChange} />
        <DateRangeControls unit={unit} range={range} onChange={onRangeChange} className="order-2 sm:order-none" />
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {format(range.from, "MMM d, yyyy")}
              <ChevronDown className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={range.from}
              onSelect={(date) => {
                if (date) {
                  onRangeChange(getRangeForView(view, date));
                  setDatePickerOpen(false);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <div className="flex items-center gap-2 rounded-md border bg-muted/60 px-3 py-1 text-sm">
          <span className="font-medium">{headerLabel}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Select
            value={activeSavedViewId ?? "custom"}
            onValueChange={(value) => onSelectSavedView(value === "custom" ? null : value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Saved views" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="custom">Current selection</SelectItem>
              {savedViews.map((viewOption) => (
                <SelectItem key={viewOption.id} value={viewOption.id}>
                  {viewOption.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" size="icon" onClick={onRefresh} aria-label="Refresh calendar">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search events, attendees, or linked work"
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <Select value={selectedProject ?? "all"} onValueChange={(value) => onProjectChange(value === "all" ? undefined : value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="All projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All projects</SelectItem>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.name ?? "Untitled project"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ToggleGroup type="single" value={density} onValueChange={(value) => value && onDensityChange(value)}>
          <ToggleGroupItem value="compact" className="px-3 py-1 text-xs">
            Compact
          </ToggleGroupItem>
          <ToggleGroupItem value="comfortable" className="px-3 py-1 text-xs">
            Comfortable
          </ToggleGroupItem>
          <ToggleGroupItem value="spacious" className="px-3 py-1 text-xs">
            Spacious
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
    </div>
  );
}

interface CalendarFooterProps {
  visibleCalendars: CalendarLayer[];
  nextEvent: CalendarTask | null;
}

function CalendarFooter({ visibleCalendars, nextEvent }: CalendarFooterProps) {
  const timezone = visibleCalendars[0]?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-background/80 px-6 py-3 text-xs text-muted-foreground">
      <span>Time zone: {timezone}</span>
      <span>{visibleCalendars.length} calendars visible</span>
      <span>
        Next event:
        {nextEvent
          ? ` ${nextEvent.title} on ${nextEvent.start_date ? format(parseISO(nextEvent.start_date), "MMM d, HH:mm") : "TBD"}`
          : " None scheduled"}
      </span>
    </footer>
  );
}

function CalendarCanvas({
  view,
  range,
  density,
  focusedDate,
  onFocusDate,
  tasks,
  getTasksForDate,
  projectLookup,
  onOpenTask,
  onOpenDayDrawer,
}: {
  view: CalendarView;
  range: DateRange;
  density: string;
  focusedDate: Date;
  onFocusDate: (date: Date) => void;
  tasks: CalendarTask[];
  getTasksForDate: (date: Date) => CalendarTask[];
  projectLookup: Map<string, string>;
  onOpenTask: (task: CalendarTask) => void;
  onOpenDayDrawer: (date: Date) => void;
}) {
  const padding = density === "compact" ? "p-2" : density === "spacious" ? "p-4" : "p-3";
  const minHeight = density === "compact" ? "min-h-[120px]" : density === "spacious" ? "min-h-[220px]" : "min-h-[160px]";
  const gap = density === "compact" ? "gap-1" : density === "spacious" ? "gap-4" : "gap-2";

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onFocusDate(addDays(focusedDate, -1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        onFocusDate(addDays(focusedDate, 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onFocusDate(addDays(focusedDate, view === "month" ? -7 : -1));
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onFocusDate(addDays(focusedDate, view === "month" ? 7 : 1));
      }
      if (event.key === "Enter") {
        event.preventDefault();
        onOpenDayDrawer(focusedDate);
      }
    },
    [focusedDate, onFocusDate, onOpenDayDrawer, view]
  );

  if (view === "month") {
    const start = startOfWeek(startOfMonth(range.from), WEEK_OPTIONS);
    const end = endOfWeek(endOfMonth(range.from), WEEK_OPTIONS);
    const days = eachDayOfInterval({ start, end });
    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <div role="grid" tabIndex={0} onKeyDown={handleKeyDown} className="grid gap-px rounded-lg border bg-border outline-none">
        {weeks.map((week, index) => (
          <div key={index} className={cn("grid grid-cols-7", gap)}>
            {week.map((day) => {
              const dayTasks = getTasksForDate(day);
              const isFocused = isSameDay(day, focusedDate);
              const remaining = dayTasks.length > MAX_VISIBLE_TASKS ? dayTasks.length - MAX_VISIBLE_TASKS : 0;
              return (
                <div
                  key={day.toISOString()}
                  role="gridcell"
                  className={cn(
                    "flex flex-col rounded-lg border bg-background",
                    padding,
                    minHeight,
                    !isSameMonth(day, range.from) && "opacity-40",
                    isFocused && "ring-2 ring-primary"
                  )}
                  onClick={() => onFocusDate(day)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{format(day, "EEE d")}</span>
                    {isToday(day) && <Badge variant="outline">Today</Badge>}
                  </div>
                  <div className="mt-2 space-y-2 text-sm">
                    {dayTasks.slice(0, MAX_VISIBLE_TASKS).map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => onOpenTask(task)}
                        className="w-full truncate rounded-md bg-primary/10 px-2 py-1 text-left hover:bg-primary/20"
                      >
                        <p className="truncate font-medium">{task.title}</p>
                        <p className="text-xs text-muted-foreground">{projectLookup.get(task.project_id) ?? "Project"}</p>
                      </button>
                    ))}
                    {remaining > 0 && (
                      <button
                        type="button"
                        onClick={() => onOpenDayDrawer(day)}
                        className="w-full rounded-md border border-dashed px-2 py-1 text-left text-xs text-muted-foreground hover:border-primary"
                      >
                        +{remaining} more
                      </button>
                    )}
                    {dayTasks.length === 0 && <p className="text-xs text-muted-foreground">No events</p>}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  }

  if (view === "week" || view === "work-week") {
    const days = eachDayOfInterval({ start: range.from, end: range.to }).filter((day) =>
      view === "work-week" ? day.getDay() !== 0 && day.getDay() !== 6 : true
    );
    return (
      <div role="grid" tabIndex={0} onKeyDown={handleKeyDown} className={cn("grid grid-cols-1 md:grid-cols-7", gap)}>
        {days.map((day) => {
          const dayTasks = getTasksForDate(day);
          const isFocused = isSameDay(day, focusedDate);
          return (
            <div
              key={day.toISOString()}
              role="gridcell"
              className={cn(
                "flex flex-col rounded-lg border bg-background",
                padding,
                minHeight,
                isFocused && "ring-2 ring-primary"
              )}
              onClick={() => onFocusDate(day)}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{format(day, "EEE d")}</span>
                {isToday(day) && <Badge variant="outline">Today</Badge>}
              </div>
              <div className="mt-3 space-y-2 text-sm">
                {dayTasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No events</p>
                ) : (
                  dayTasks.map((task) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => onOpenTask(task)}
                      className="w-full truncate rounded-md bg-primary/10 px-2 py-1 text-left hover:bg-primary/20"
                    >
                      <p className="truncate font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">{projectLookup.get(task.project_id) ?? "Project"}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (view === "day") {
    const dayTasks = getTasksForDate(focusedDate);
    return (
      <div role="grid" tabIndex={0} onKeyDown={handleKeyDown} className="flex flex-col gap-4">
        <div className={cn("rounded-lg border bg-background", padding)}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{format(focusedDate, "EEEE, MMM d")}</h2>
            {isToday(focusedDate) && <Badge variant="outline">Today</Badge>}
          </div>
          <div className="mt-4 space-y-3 text-sm">
            {dayTasks.length === 0 ? (
              <p className="text-muted-foreground">No events today.</p>
            ) : (
              dayTasks.map((task) => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => onOpenTask(task)}
                  className="flex w-full flex-col rounded-md border bg-muted/40 px-3 py-2 text-left transition hover:border-primary"
                >
                  <span className="font-medium">{task.title}</span>
                  <span className="text-xs text-muted-foreground">{projectLookup.get(task.project_id) ?? "Project"}</span>
                </button>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center text-sm text-muted-foreground">
      The {view} view will render detailed layouts in a later phase. Saved views, calendar subscriptions, and the refreshed layout
      are ready for use today.
    </div>
  );
}

function CalendarPageContent() {
  const [view, setView] = useState<CalendarView>("week");
  const [range, setRange] = useState<DateRange>(() => getRangeForView("week", new Date()));
  const [focusedDate, setFocusedDate] = useState<Date>(range.from);
  const [selectedProject, setSelectedProject] = useState<string | undefined>(undefined);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTask, setSelectedTask] = useState<CalendarTask | null>(null);
  const [expandedDay, setExpandedDay] = useState<Date | null>(null);
  const [isDayDrawerOpen, setIsDayDrawerOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);

  const {
    calendars,
    visibleCalendars,
    loading,
    error,
    density,
    setDensity,
    savedViews,
    activeSavedViewId,
    toggleCalendarVisibility,
    setCalendarColor,
    subscribeToCalendar,
    unsubscribeFromCalendar,
    createSavedView,
    applySavedView,
    refreshCalendars,
  } = useCalendarState();

  const { data: projects = [] } = useProjectsList();
  const projectLookup = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach((project) => {
      map.set(project.id, project.name ?? "Untitled project");
    });
    return map;
  }, [projects]);

  const visibleCalendarIds = useMemo(
    () => (visibleCalendars.length > 0 ? visibleCalendars.map((calendar) => calendar.id) : undefined),
    [visibleCalendars]
  );

  const { tasks, isLoading, error: taskError, refetch } = useCalendarRange({
    from: range.from,
    to: range.to,
    projectId: selectedProject,
    calendarIds: visibleCalendarIds,
  });

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = searchTerm
        ? `${task.title} ${task.assignee ?? ""} ${task.status ?? ""}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        : true;
      const matchesStatus = statusFilter === "all" ? true : task.status?.toLowerCase() === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, statusFilter]);

  const tasksByDay = useMemo(() => buildTasksByDay(filteredTasks), [filteredTasks]);

  const getTasksForDate = useCallback((date: Date) => tasksByDay.get(getDayKey(date)) ?? [], [tasksByDay]);

  const expandedDayTasks = expandedDay ? getTasksForDate(expandedDay) : [];

  useEffect(() => {
    document.title = "Calendar";
  }, []);

  const unitMap: Record<CalendarView, CalendarUnit> = {
    day: "day",
    "work-week": "week",
    week: "week",
    month: "month",
    quarter: "quarter",
    year: "year",
    timeline: "month",
    agenda: "week",
    gantt: "month",
  };

  const headerLabel = useMemo(() => formatHeaderLabel(view, range), [view, range]);

  const handleRangeChange = (nextRange: DateRange) => {
    setRange(nextRange);
    setFocusedDate(nextRange.from);
  };

  const updateFocusedDate = (next: Date) => {
    setFocusedDate(next);
    if (next < range.from || next > range.to) {
      const nextRange = getRangeForView(view, next);
      setRange(nextRange);
    }
  };

  const openDayDrawer = (date: Date) => {
    setExpandedDay(date);
    setIsDayDrawerOpen(true);
  };

  const openTask = (task: CalendarTask) => {
    setSelectedTask(task);
  };

  const selectedCalendar = selectedTask
    ? calendars.find((calendar) => calendar.id === selectedTask.calendar_id) ?? null
    : null;

  const nextEvent = useMemo(() => {
    const now = new Date();
    const upcoming = [...filteredTasks]
      .map((task) => ({ task, interval: normalizeTaskInterval(task) }))
      .filter((item) => item.interval?.start && item.interval.start >= now)
      .sort((a, b) => (a.interval!.start.getTime() - b.interval!.start.getTime()));
    return upcoming[0]?.task ?? null;
  }, [filteredTasks]);

  const renderContent = () => {
    if (isLoading) {
      return <CalendarSkeleton />;
    }

    if (taskError) {
      return (
        <div className="flex flex-col gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            <span>We could not load the calendar right now.</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </div>
      );
    }

    if (filteredTasks.length === 0) {
      return <CalendarEmptyState message="No events in this range." />;
    }

    return (
      <CalendarCanvas
        view={view}
        range={range}
        density={density}
        focusedDate={focusedDate}
        onFocusDate={updateFocusedDate}
        tasks={filteredTasks}
        getTasksForDate={getTasksForDate}
        projectLookup={projectLookup}
        onOpenTask={openTask}
        onOpenDayDrawer={openDayDrawer}
      />
    );
  };

  return (
    <div className="flex h-full flex-col">
      <CalendarTopBar
        view={view}
        onViewChange={(next) => {
          setView(next);
          const nextRange = getRangeForView(next, focusedDate);
          setRange(nextRange);
        }}
        range={range}
        unit={unitMap[view]}
        onRangeChange={handleRangeChange}
        headerLabel={headerLabel}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={setSelectedProject}
        density={density}
        onDensityChange={setDensity}
        savedViews={savedViews}
        activeSavedViewId={activeSavedViewId}
        onSelectSavedView={applySavedView}
        onOpenSaveDialog={() => setIsSaveDialogOpen(true)}
        onRefresh={() => {
          void refreshCalendars();
          void refetch();
        }}
      />
      <div className="flex flex-1 overflow-hidden">
        <CalendarLeftRail
          calendars={calendars}
          loading={loading}
          error={error}
          onRefresh={() => void refreshCalendars()}
          onToggleVisibility={toggleCalendarVisibility}
          onColorChange={setCalendarColor}
          onSubscribe={subscribeToCalendar}
          onUnsubscribe={unsubscribeFromCalendar}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-auto p-6">{renderContent()}</div>
          <CalendarFooter visibleCalendars={visibleCalendars} nextEvent={nextEvent} />
        </div>
        <EventDetailPanel
          task={selectedTask}
          calendar={selectedCalendar}
          projectName={selectedTask ? projectLookup.get(selectedTask.project_id) ?? undefined : undefined}
          onClose={() => setSelectedTask(null)}
        />
      </div>
      <DayTasksDrawer
        date={expandedDay}
        tasks={expandedDayTasks}
        open={isDayDrawerOpen}
        onClose={() => {
          setIsDayDrawerOpen(false);
          setExpandedDay(null);
        }}
        onSelectTask={(task) => {
          setSelectedTask(task);
          setIsDayDrawerOpen(false);
        }}
        getProjectName={(projectId) => projectLookup.get(projectId) ?? "Project"}
      />
      <SaveViewDialog
        open={isSaveDialogOpen}
        onOpenChange={setIsSaveDialogOpen}
        calendars={calendars}
        onSubmit={({ name, description }) =>
          createSavedView({
            name,
            description,
            calendarIds: visibleCalendars.map((calendar) => calendar.id),
          })
        }
      />
    </div>
  );
}

export default function CalendarPage() {
  return (
    <CalendarProvider>
      <CalendarPageContent />
    </CalendarProvider>
  );
}

