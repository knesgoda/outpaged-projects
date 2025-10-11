import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  differenceInMinutes,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  setHours,
  setMinutes,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  formatDistanceToNowStrict,
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  AlertCircle,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Filter,
  Layers,
  Link2,
  MousePointer2,
  Palette,
  Plus,
  Search,
  Share2,
  Users,
  Trash2,
  HelpCircle,
  Undo2,
  Redo2,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRangeControls, type CalendarUnit, type DateRange } from "@/components/common/DateRangeControls";
import { ViewSwitch, type CalendarView } from "@/components/common/ViewSwitch";
import { useCalendarRange } from "@/hooks/useCalendar";
import { EventCard } from "@/components/calendar/EventCard";
import { EventContextMenu } from "@/components/calendar/EventContextMenu";
import { EventEditorDialog } from "@/components/calendar/EventEditorDialog";
import { VirtualizedList } from "@/components/calendar/VirtualizedList";
import { PeopleScheduleView } from "@/components/calendar/PeopleScheduleView";
import { ResourceScheduleView } from "@/components/calendar/ResourceScheduleView";
import { AvailabilityHeatmap } from "@/components/calendar/AvailabilityHeatmap";
import { FilterBuilder } from "@/components/calendar/FilterBuilder";
import { NotificationCenter } from "@/components/calendar/NotificationCenter";
import { IntegrationManager } from "@/components/calendar/IntegrationManager";
import { AutomationRulesPanel } from "@/components/calendar/AutomationRulesPanel";
import { SharingPermissionsPanel } from "@/components/calendar/SharingPermissionsPanel";
import { SchedulingAssistantPanel } from "@/components/calendar/SchedulingAssistantPanel";
import { CalendarLegend } from "@/components/calendar/CalendarLegend";
import { AgendaPane } from "@/components/calendar/AgendaPane";
import { CalendarAnalyticsPanel } from "@/components/calendar/CalendarAnalyticsPanel";
import { CalendarExportPanel } from "@/components/calendar/CalendarExportPanel";
import { CalendarMobileShell } from "@/components/calendar/CalendarMobileShell";
import { CalendarAdminPanel } from "@/components/calendar/CalendarAdminPanel";
import { CalendarProvider, useCalendarState } from "@/state/calendar";
import type {
  CalendarColorEncoding,
  CalendarEvent,
  CalendarFilterCondition,
  CalendarFilterGroup,
  CalendarLayer,
  CalendarSavedFilter,
  CalendarSearchToken,
  CalendarComment,
  CalendarVisualCategory,
  CalendarExportOptions,
  CalendarRSVPStatus,
} from "@/types/calendar";
import {
  MOCK_AVAILABILITY,
  MOCK_CALENDAR_PEOPLE,
  MOCK_CALENDAR_RESOURCES,
  MOCK_NOTIFICATIONS,
} from "@/data/calendarAvailability";
import { VISUAL_CATEGORIES, eventMatchesVisualCategory } from "@/components/calendar/visualEncoding";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

const HOUR_HEIGHT_BY_DENSITY: Record<string, number> = {
  compact: 40,
  comfortable: 56,
  spacious: 72,
};

const SNAP_OPTIONS = [5, 15, 30];

const CALENDAR_CACHE_KEY = "calendar.cachedEvents";

const WORKING_HOURS = { start: 9, end: 17 };

type DragMode = "move" | "resize-start" | "resize-end" | null;

function getRangeForView(view: CalendarView, pivot: Date): DateRange {
  switch (view) {
    case "day":
      return { from: startOfDay(pivot), to: endOfDay(pivot) };
    case "work-week": {
      const start = startOfWeek(pivot, WEEK_OPTIONS);
      return { from: start, to: addDays(start, 4) };
    }
    case "week":
      return { from: startOfWeek(pivot, WEEK_OPTIONS), to: endOfWeek(pivot, WEEK_OPTIONS) };
    case "quarter":
      return { from: startOfQuarter(pivot), to: endOfQuarter(pivot) };
    case "year":
      return { from: startOfYear(pivot), to: endOfYear(pivot) };
    case "timeline":
    case "gantt":
      return { from: startOfMonth(pivot), to: endOfMonth(pivot) };
    case "people":
    case "resources":
      return { from: startOfWeek(pivot, WEEK_OPTIONS), to: endOfWeek(pivot, WEEK_OPTIONS) };
    case "agenda":
      return { from: startOfDay(pivot), to: endOfWeek(pivot, WEEK_OPTIONS) };
    case "month":
    default:
      return { from: startOfMonth(pivot), to: endOfMonth(pivot) };
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
    case "people":
      return `People • ${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    case "resources":
      return `Resources • ${format(range.from, "MMM d")} – ${format(range.to, "MMM d")}`;
    case "month":
    default:
      return format(range.from, "MMMM yyyy");
  }
}

function roundToSnap(date: Date, snapMinutes: number) {
  const minutes = date.getMinutes();
  const snapped = Math.round(minutes / snapMinutes) * snapMinutes;
  const result = new Date(date);
  result.setMinutes(0);
  result.setSeconds(0);
  result.setMilliseconds(0);
  result.setMinutes(snapped);
  return result;
}

function clampDateWithinDay(date: Date, reference: Date) {
  const start = startOfDay(reference);
  const end = endOfDay(reference);
  if (date < start) return start;
  if (date > end) return end;
  return date;
}

function detectConflicts(events: CalendarEvent[]): Set<string> {
  const conflicts = new Set<string>();
  const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
  for (let i = 0; i < sorted.length; i += 1) {
    const current = sorted[i];
    const currentStart = new Date(current.start).getTime();
    const currentEnd = new Date(current.end).getTime();
    for (let j = i + 1; j < sorted.length; j += 1) {
      const next = sorted[j];
      const nextStart = new Date(next.start).getTime();
      if (nextStart >= currentEnd) break;
      conflicts.add(current.id);
      conflicts.add(next.id);
    }
  }
  return conflicts;
}

function parseSearchTokens(query: string): CalendarSearchToken[] {
  const parts = query
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  const tokens = parts.map((part, index) => {
    if (part.startsWith("@") && part.length > 1) {
      const value = part.slice(1).toLowerCase();
      return { id: `token-${index}`, type: "user" as const, value, display: part } satisfies CalendarSearchToken;
    }
    if (part.startsWith("#") && part.length > 1) {
      const value = part.slice(1).toLowerCase();
      return { id: `token-${index}`, type: "project" as const, value, display: part } satisfies CalendarSearchToken;
    }
    if (part.startsWith("tag:") && part.length > 4) {
      const value = part.slice(4).toLowerCase();
      return { id: `token-${index}`, type: "tag" as const, value, display: part } satisfies CalendarSearchToken;
    }
    return { id: `token-${index}`, type: "keyword" as const, value: part.toLowerCase(), display: part } satisfies CalendarSearchToken;
  });
  const unique = new Map<string, CalendarSearchToken>();
  tokens.forEach((token) => {
    unique.set(`${token.type}:${token.value}`, token);
  });
  return Array.from(unique.values());
}

function matchesCondition(event: CalendarEvent, condition: CalendarFilterCondition): boolean {
  const { field, operator, value } = condition;
  const normalizedValue = typeof value === "string" ? value.toLowerCase() : value;
  const now = new Date();
  const eventStart = new Date(event.start);

  const ensureArray = (input?: string[] | null) => input ?? [];
  const includesValue = (list: string[], target?: string) => {
    if (!target) return false;
    return list.some((item) => item.toLowerCase() === target.toLowerCase());
  };

  const getLinkedTypes = () => ensureArray(event.linkedItems?.map((item) => item.type));
  const getLabels = () => ensureArray(event.labels);

  const evaluateString = (actual?: string | null) => {
    const compared = actual?.toLowerCase() ?? "";
    const expected = typeof normalizedValue === "string" ? normalizedValue : "";
    switch (operator) {
      case "equals":
        return compared === expected;
      case "not-equals":
        return compared !== expected;
      case "includes":
        return compared.includes(expected);
      case "excludes":
        return !compared.includes(expected);
      case "exists":
        return compared.length > 0;
      case "not-exists":
        return compared.length === 0;
      default:
        return true;
    }
  };

  switch (field) {
    case "calendar":
      return evaluateString(event.calendarId);
    case "owner":
      if (operator === "exists") return Boolean(event.ownerId);
      if (operator === "not-exists") return !event.ownerId;
      return (
        evaluateString(event.ownerId) ||
        (event.organizer ? evaluateString(event.organizer) : false) ||
        ensureArray(event.attendees?.map((attendee) => attendee.name ?? attendee.email ?? "")).some((name) =>
          name.toLowerCase().includes(typeof normalizedValue === "string" ? normalizedValue : "")
        )
      );
    case "team":
      return evaluateString(event.teamId);
    case "project":
      return evaluateString(event.projectId);
    case "status":
      return evaluateString(event.status);
    case "type":
      return evaluateString(event.type);
    case "priority":
      return evaluateString(event.priority);
    case "label": {
      const labels = getLabels();
      if (operator === "exists") return labels.length > 0;
      if (operator === "not-exists") return labels.length === 0;
      const expected = typeof normalizedValue === "string" ? normalizedValue : "";
      return operator === "excludes" ? !includesValue(labels, expected) : includesValue(labels, expected);
    }
    case "linkedItemType": {
      const types = getLinkedTypes();
      if (operator === "exists") return types.length > 0;
      if (operator === "not-exists") return types.length === 0;
      const expected = typeof normalizedValue === "string" ? normalizedValue : "";
      return operator === "excludes" ? !includesValue(types, expected) : includesValue(types, expected);
    }
    case "hasAttachments": {
      const has = (event.attachments?.length ?? 0) > 0 || event.hasAttachments;
      return operator === "not-exists" ? !has : has;
    }
    case "hasReminders": {
      const has = (event.reminders?.length ?? 0) > 0 || event.hasReminders;
      return operator === "not-exists" ? !has : has;
    }
    case "timeRange": {
      if (operator === "in-range" && typeof normalizedValue === "string") {
        if (normalizedValue === "upcoming") {
          return eventStart >= now;
        }
        if (normalizedValue === "past") {
          return eventStart < now;
        }
        if (normalizedValue === "next7d") {
          const nextWeek = addDays(now, 7);
          return eventStart >= now && eventStart <= nextWeek;
        }
      }
      if (operator === "in-range" && value && typeof value === "object" && "from" in value && "to" in value) {
        const from = new Date(value.from);
        const to = new Date(value.to);
        return eventStart >= from && eventStart <= to;
      }
      return true;
    }
    default:
      return true;
  }
}

function matchesFilterGroups(event: CalendarEvent, groups: CalendarFilterGroup[]): boolean {
  if (!groups || groups.length === 0) return true;
  return groups.every((group) => {
    if (group.conditions.length === 0) {
      return true;
    }
    if (group.logic === "OR") {
      return group.conditions.some((condition) => matchesCondition(event, condition));
    }
    return group.conditions.every((condition) => matchesCondition(event, condition));
  });
}

function matchesSearchTokens(event: CalendarEvent, tokens: CalendarSearchToken[]): boolean {
  if (!tokens || tokens.length === 0) return true;
  return tokens.every((token) => {
    switch (token.type) {
      case "keyword": {
        const haystack = `${event.title ?? ""} ${event.description ?? ""}`.toLowerCase();
        return haystack.includes(token.value);
      }
      case "user": {
        const owner = event.ownerName?.toLowerCase() ?? "";
        const attendees = (event.attendees ?? []).map((attendee) =>
          (attendee.name ?? attendee.email ?? "").toLowerCase()
        );
        return owner.includes(token.value) || attendees.some((entry) => entry.includes(token.value));
      }
      case "project":
        return (
          (event.projectId ?? "").toLowerCase().includes(token.value) ||
          (event.linkedItems ?? []).some((link) => link.id.toLowerCase().includes(token.value))
        );
      case "tag": {
        const labels = (event.labels ?? []).map((label) => label.toLowerCase());
        return labels.includes(token.value);
      }
      default:
        return true;
    }
  });
}

function applyFiltersToEvents(
  events: CalendarEvent[],
  groups: CalendarFilterGroup[],
  tokens: CalendarSearchToken[]
) {
  return events.filter((event) => matchesFilterGroups(event, groups) && matchesSearchTokens(event, tokens));
}

interface QuickAddResult {
  title: string;
  start: Date;
  end: Date;
  calendarId?: string;
}

function cloneEventsForHistory(events: CalendarEvent[]): CalendarEvent[] {
  try {
    return typeof structuredClone === "function" ? structuredClone(events) : JSON.parse(JSON.stringify(events));
  } catch {
    return events.map((event) => ({ ...event }));
  }
}

function parseQuickAddInput(input: string, fallbackDate: Date): QuickAddResult | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const calendarMatch = trimmed.match(/#([\w.-]+)/);
  const calendarId = calendarMatch ? `calendar.${calendarMatch[1]}` : undefined;

  const now = new Date();
  let date = fallbackDate;
  if (/tomorrow/i.test(trimmed)) {
    date = addDays(startOfDay(now), 1);
  } else if (/today/i.test(trimmed)) {
    date = startOfDay(now);
  }

  const timeMatch = trimmed.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  let start = setHours(date, 9);
  let end = setHours(date, 10);
  if (timeMatch) {
    const [, startHourRaw, startMinutesRaw, startPeriod, endHourRaw, endMinutesRaw, endPeriod] = timeMatch;
    const parseHour = (raw: string, period?: string | null) => {
      let hour = Number(raw) % 12;
      if (period?.toLowerCase() === "pm") {
        hour += 12;
      }
      return hour;
    };
    start = setMinutes(setHours(date, parseHour(startHourRaw, startPeriod)), Number(startMinutesRaw ?? "0"));
    end = setMinutes(setHours(date, parseHour(endHourRaw, endPeriod)), Number(endMinutesRaw ?? "0"));
    if (end <= start) {
      end = new Date(start.getTime() + 60 * 60 * 1000);
    }
  }

  const title = trimmed
    .replace(calendarMatch?.[0] ?? "", "")
    .replace(timeMatch?.[0] ?? "", "")
    .replace(/\btoday\b|\btomorrow\b/gi, "")
    .trim();

  return {
    title: title || "Untitled event",
    start,
    end,
    calendarId,
  };
}

function getNextWorkingHour(date: Date) {
  const next = new Date(date);
  next.setHours(WORKING_HOURS.start, 0, 0, 0);
  return next;
}

function createEventFromQuickAdd(result: QuickAddResult, defaultCalendarId: string): CalendarEvent {
  return {
    id: `event-${crypto.randomUUID?.() ?? Date.now()}`,
    calendarId: result.calendarId ?? defaultCalendarId,
    title: result.title,
    start: result.start.toISOString(),
    end: result.end.toISOString(),
    status: "confirmed",
    priority: "normal",
    visibility: "team",
    reminders: [{ id: `rem-${Date.now()}`, offsetMinutes: 10, method: "popup" }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    hasReminders: true,
  };
}

function useKeyboardNavigation({
  view,
  onNavigate,
  onOpenGoto,
}: {
  view: CalendarView;
  onNavigate: (direction: "prev" | "next" | "today") => void;
  onOpenGoto: () => void;
}) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT" || (event.target as HTMLElement)?.tagName === "TEXTAREA") {
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onNavigate("prev");
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNavigate("next");
      } else if (event.key === "PageUp") {
        event.preventDefault();
        onNavigate("prev");
      } else if (event.key === "PageDown") {
        event.preventDefault();
        onNavigate("next");
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        onOpenGoto();
      } else if (event.key.toLowerCase() === "t") {
        onNavigate("today");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onNavigate, onOpenGoto, view]);
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
  colorEncoding,
  onColorEncodingChange,
  savedFilters,
  activeFilterId,
  onApplyFilter,
  onDeleteFilter,
}: {
  calendars: CalendarLayer[];
  loading: boolean;
  error: Error | null;
  onRefresh: () => void;
  onToggleVisibility: (calendarId: string) => void;
  onColorChange: (calendarId: string, color: string) => void;
  onSubscribe: (calendarId: string) => void;
  onUnsubscribe: (calendarId: string) => void;
  colorEncoding: CalendarColorEncoding;
  onColorEncodingChange: (mode: CalendarColorEncoding) => void;
  savedFilters: CalendarSavedFilter[];
  activeFilterId: string | null;
  onApplyFilter: (filterId: string | null) => void;
  onDeleteFilter: (filterId: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const grouped = useMemo(() => {
    return calendars
      .filter((calendar) => calendar.name.toLowerCase().includes(filter.toLowerCase()))
      .reduce<Record<string, CalendarLayer[]>>((acc, calendar) => {
        const bucket = acc[calendar.type] ?? [];
        bucket.push(calendar);
        acc[calendar.type] = bucket;
        return acc;
      }, {});
  }, [calendars, filter]);

  return (
    <aside className="hidden w-72 shrink-0 flex-col border-r bg-muted/10 px-4 py-6 lg:flex">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Calendars</h2>
        <Button size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" /> Add
        </Button>
      </div>
      <div className="mt-4 space-y-4">
        <Input
          placeholder="Search calendars"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter calendar list"
        />
        <div className="space-y-2 text-sm">
          <Label className="text-xs uppercase text-muted-foreground">Color mode</Label>
          <Select value={colorEncoding} onValueChange={(value) => onColorEncodingChange(value as CalendarColorEncoding)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Color by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="calendar">Calendar</SelectItem>
              <SelectItem value="status">Status</SelectItem>
              <SelectItem value="type">Type</SelectItem>
              <SelectItem value="priority">Priority</SelectItem>
              <SelectItem value="custom">Custom palette</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ScrollArea className="mt-6 flex-1 pr-4 text-sm">
        {loading ? (
          <p className="text-muted-foreground">Loading calendars…</p>
        ) : error ? (
          <div className="space-y-2 text-muted-foreground">
            <p className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-4 w-4" />Failed to load calendars.
            </p>
            <Button size="sm" variant="outline" onClick={onRefresh}>
              Retry
            </Button>
          </div>
        ) : (
          Object.entries(grouped).map(([bucket, items]) => (
            <div key={bucket} className="mb-6 space-y-3">
              <h3 className="text-xs font-semibold uppercase text-muted-foreground">{bucket}</h3>
              <ul className="space-y-2">
                {items.map((calendar) => (
                  <li key={calendar.id} className="rounded-md border bg-background p-3 shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => onToggleVisibility(calendar.id)}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: calendar.color }}
                          aria-hidden="true"
                        />
                        <span className={cn(calendar.visible ? "" : "opacity-60")}>{calendar.name}</span>
                      </button>
                      <Switch
                        checked={calendar.subscribed}
                        onCheckedChange={(checked) =>
                          checked ? onSubscribe(calendar.id) : onUnsubscribe(calendar.id)
                        }
                        aria-label="Subscribe"
                      />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Palette className="h-3 w-3" />
                        <input
                          type="color"
                          className="h-5 w-10 cursor-pointer border"
                          value={calendar.color}
                          onChange={(event) => onColorChange(calendar.id, event.target.value)}
                          aria-label={`Select color for ${calendar.name}`}
                        />
                      </div>
                      {calendar.timezone && <span>{calendar.timezone}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </ScrollArea>
      <Separator className="my-4" />
      <div className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground">Saved filters</h3>
          <Button size="sm" variant="ghost" onClick={() => onApplyFilter(null)}>
            Clear
          </Button>
        </div>
        <div className="space-y-2">
          {savedFilters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No saved filters yet.</p>
          ) : (
            savedFilters.map((saved) => (
              <div
                key={saved.id}
                className={cn(
                  "flex items-center justify-between rounded-md border px-3 py-2",
                  saved.id === activeFilterId ? "border-primary bg-primary/5" : "bg-background"
                )}
              >
                <button
                  type="button"
                  className="flex flex-1 flex-col text-left"
                  onClick={() => onApplyFilter(saved.id)}
                >
                  <span className="text-sm font-medium">{saved.name}</span>
                  {saved.description && (
                    <span className="text-xs text-muted-foreground">{saved.description}</span>
                  )}
                </button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => onDeleteFilter(saved.id)}
                  aria-label={`Delete saved filter ${saved.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}

interface DayCellProps {
  date: Date;
  events: CalendarEvent[];
  onSelect: (id: string, additive: boolean) => void;
  onOpenDetail: (id: string) => void;
  selectedEvents: Set<string>;
  colorEncoding: CalendarColorEncoding;
  onJoinMeeting: (id: string) => void;
  onDragStart: (eventId: string, mode: Exclude<DragMode, null>) => void;
  hourHeight: number;
  snapMinutes: number;
  focusMode: boolean;
  onDrop: (eventId: string, mode: Exclude<DragMode, null>, target: Date) => void;
  dualTimezone: boolean;
  secondaryTimezone: string;
  conflicts: Set<string>;
  onDeleteEvent: (id: string) => void;
  highlightCategory: CalendarVisualCategory | null;
}

function DayCell({
  date,
  events,
  onSelect,
  onOpenDetail,
  selectedEvents,
  colorEncoding,
  onJoinMeeting,
  onDragStart,
  hourHeight,
  snapMinutes,
  focusMode,
  onDrop,
  dualTimezone,
  secondaryTimezone,
  conflicts,
  onDeleteEvent,
  highlightCategory,
}: DayCellProps) {
  const hours = focusMode ? Array.from({ length: WORKING_HOURS.end - WORKING_HOURS.start }, (_, idx) => WORKING_HOURS.start + idx) : Array.from({ length: 24 }, (_, idx) => idx);

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const payload = event.dataTransfer.getData("application/calendar-event");
    if (!payload) return;
    const parsed = JSON.parse(payload) as { id: string; mode: Exclude<DragMode, null> };
    onDrop(parsed.id, parsed.mode, new Date(Number(event.currentTarget.dataset.timestamp)));
  };

  return (
    <div className="relative flex flex-col border">
      <header className={cn("flex items-center justify-between border-b px-3 py-2 text-xs", isToday(date) && "bg-primary/5 font-semibold")}
        aria-label={format(date, "EEEE MMM d")}
      >
        <span>
          {format(date, "EEE d")}
          {isToday(date) && <Badge variant="outline" className="ml-2">Today</Badge>}
        </span>
        {dualTimezone && (
          <span className="text-muted-foreground">{new Intl.DateTimeFormat("en-US", { timeZone: secondaryTimezone, hour: "2-digit", minute: "2-digit" }).format(date)}</span>
        )}
      </header>
      <div className="relative flex-1" style={{ minHeight: 24 * hourHeight }}>
        {hours.map((hour) => {
          const slot = setHours(startOfDay(date), hour);
          const displayHour = focusMode ? hour : hour;
          const label = focusMode ? `${displayHour}:00` : `${hour}:00`;
          return (
            <div
              key={hour}
              className="relative flex h-full border-b last:border-0"
              style={{ height: hourHeight }}
              data-hour={hour}
            >
              <div className="w-12 border-r p-1 text-[10px] text-muted-foreground">{label}</div>
              <div
                className="flex-1"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                data-timestamp={setMinutes(slot, 0).getTime()}
              />
            </div>
          );
        })}
        <div className="absolute inset-0 space-y-2 px-2 py-2">
          {events.map((event) => (
            <EventContextMenu
              key={event.id}
              onEdit={() => onOpenDetail(event.id)}
              onDuplicate={() => {
                onSelect(event.id, false);
              }}
              onMoveCalendar={() => onOpenDetail(event.id)}
              onLinkItem={() => onOpenDetail(event.id)}
              onConvertMilestone={() => onOpenDetail(event.id)}
              onShare={() => navigator.clipboard.writeText(event.title).catch(() => undefined)}
              onExport={() => navigator.clipboard.writeText(event.title).catch(() => undefined)}
              onCopyId={() => navigator.clipboard.writeText(event.id).catch(() => undefined)}
              onDelete={() => onDeleteEvent(event.id)}
            >
              <div className={cn(conflicts.has(event.id) && "border-red-400")}
                draggable
                onDragStart={(dragEvent) => {
                  dragEvent.dataTransfer.setData("application/calendar-event", JSON.stringify({ id: event.id, mode: "move" }));
                  onDragStart(event.id, "move");
                }}
              >
                <EventCard
                  event={event}
                  colorEncoding={colorEncoding}
                  isSelected={selectedEvents.has(event.id)}
                  onSelect={onSelect}
                  onOpenDetail={onOpenDetail}
                  onJoinMeeting={onJoinMeeting}
                  onDragStart={onDragStart}
                  highlightCategory={highlightCategory}
                />
              </div>
            </EventContextMenu>
          ))}
        </div>
      </div>
    </div>
  );
}

function AgendaView({
  events,
  onSelect,
  onOpenDetail,
  selectedEvents,
  colorEncoding,
  onJoinMeeting,
  onDragStart,
  onDeleteEvent,
  highlightCategory,
}: {
  events: CalendarEvent[];
  onSelect: (id: string, additive: boolean) => void;
  onOpenDetail: (id: string) => void;
  selectedEvents: Set<string>;
  colorEncoding: CalendarColorEncoding;
  onJoinMeeting: (id: string) => void;
  onDragStart: (eventId: string, mode: Exclude<DragMode, null>) => void;
  onDeleteEvent: (id: string) => void;
  highlightCategory: CalendarVisualCategory | null;
}) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [events]
  );

  return (
    <VirtualizedList
      items={sorted}
      itemHeight={120}
      className="h-full"
      renderItem={(event) => (
        <div className="p-2">
          <EventContextMenu
            onEdit={() => onOpenDetail(event.id)}
            onDuplicate={() => onSelect(event.id, true)}
            onMoveCalendar={() => onOpenDetail(event.id)}
            onLinkItem={() => onOpenDetail(event.id)}
            onConvertMilestone={() => onOpenDetail(event.id)}
            onShare={() => navigator.clipboard.writeText(event.title).catch(() => undefined)}
            onExport={() => navigator.clipboard.writeText(event.title).catch(() => undefined)}
            onCopyId={() => navigator.clipboard.writeText(event.id).catch(() => undefined)}
            onDelete={() => onDeleteEvent(event.id)}
          >
          <EventCard
            event={event}
            colorEncoding={colorEncoding}
            isSelected={selectedEvents.has(event.id)}
            onSelect={onSelect}
            onOpenDetail={onOpenDetail}
            onJoinMeeting={onJoinMeeting}
            onDragStart={onDragStart}
            highlightCategory={highlightCategory}
          />
          </EventContextMenu>
        </div>
      )}
    />
  );
}

function MonthView({
  range,
  events,
  onSelect,
  onOpenDetail,
  selectedEvents,
  colorEncoding,
  onJoinMeeting,
  onDragStart,
  conflicts,
  onDeleteEvent,
  highlightCategory,
}: {
  range: DateRange;
  events: CalendarEvent[];
  onSelect: (id: string, additive: boolean) => void;
  onOpenDetail: (id: string) => void;
  selectedEvents: Set<string>;
  colorEncoding: CalendarColorEncoding;
  onJoinMeeting: (id: string) => void;
  onDragStart: (eventId: string, mode: Exclude<DragMode, null>) => void;
  conflicts: Set<string>;
  onDeleteEvent: (id: string) => void;
  highlightCategory: CalendarVisualCategory | null;
}) {
  const days = eachDayOfInterval(range);
  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = format(parseISO(event.start), "yyyy-MM-dd");
      const existing = map.get(key) ?? [];
      existing.push(event);
      map.set(key, existing);
    });
    return map;
  }, [events]);

  return (
    <div className="grid flex-1 grid-cols-7 gap-px rounded-lg border bg-border">
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const dayEvents = byDay.get(key) ?? [];
        return (
          <div key={key} className={cn("flex min-h-[160px] flex-col bg-background", isToday(day) && "ring-1 ring-primary")}
            aria-label={format(day, "EEEE MMM d")}
          >
            <div className={cn("flex items-center justify-between border-b px-2 py-1 text-xs", isSameMonth(day, range.from) ? "" : "text-muted-foreground")}
            >
              <span>{format(day, "d")}</span>
              {isSameMonth(day, range.from) ? null : <span className="text-[10px]">{format(day, "MMM")}</span>}
            </div>
            <div className="flex-1 space-y-1 overflow-hidden px-2 py-2">
              {dayEvents.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No events</p>
              ) : (
                dayEvents.slice(0, 3).map((event) => (
                  <EventContextMenu
                    key={event.id}
                    onEdit={() => onOpenDetail(event.id)}
                    onDuplicate={() => onSelect(event.id, true)}
                    onMoveCalendar={() => onOpenDetail(event.id)}
                    onLinkItem={() => onOpenDetail(event.id)}
                    onConvertMilestone={() => onOpenDetail(event.id)}
                    onShare={() => navigator.clipboard.writeText(event.title).catch(() => undefined)}
                    onExport={() => navigator.clipboard.writeText(event.title).catch(() => undefined)}
                    onCopyId={() => navigator.clipboard.writeText(event.id).catch(() => undefined)}
                    onDelete={() => onDeleteEvent(event.id)}
                  >
                    <EventCard
                      event={event}
                      colorEncoding={colorEncoding}
                      isSelected={selectedEvents.has(event.id)}
                      onSelect={onSelect}
                      onOpenDetail={onOpenDetail}
                      onJoinMeeting={onJoinMeeting}
                      onDragStart={onDragStart}
                      highlightCategory={highlightCategory}
                    />
                    {conflicts.has(event.id) && <p className="mt-1 text-[10px] text-destructive">Conflict</p>}
                  </EventContextMenu>
                ))
              )}
              {dayEvents.length > 3 && (
                <button
                  type="button"
                  className="w-full rounded-md border bg-muted/30 py-1 text-[11px]"
                  onClick={() => onOpenDetail(dayEvents[0].id)}
                >
                  +{dayEvents.length - 3} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function YearView({ events }: { events: CalendarEvent[] }) {
  const months = eachMonthOfInterval({ from: startOfYear(new Date()), to: endOfYear(new Date()) });
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    events.forEach((event) => {
      const key = format(parseISO(event.start), "yyyy-MM");
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    return map;
  }, [events]);

  return (
    <VirtualizedList
      items={months}
      itemHeight={180}
      className="h-full"
      renderItem={(month) => {
        const key = format(month, "yyyy-MM");
        const volume = counts.get(key) ?? 0;
        const intensity = Math.min(volume / 5, 1);
        return (
          <div className="grid grid-cols-7 gap-px rounded-md border bg-border p-2">
            <h3 className="col-span-7 text-sm font-semibold">{format(month, "MMMM yyyy")}</h3>
            {eachDayOfInterval({ from: startOfMonth(month), to: endOfMonth(month) }).map((day) => (
              <div
                key={format(day, "yyyy-MM-dd")}
                className="flex h-16 flex-col items-center justify-center bg-background text-[11px]"
                style={{ backgroundColor: `rgba(37, 99, 235, ${intensity})` }}
              >
                <span>{format(day, "d")}</span>
              </div>
            ))}
          </div>
        );
      }}
    />
  );
}

function TimelineView({ events }: { events: CalendarEvent[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [events]
  );

  return (
    <div className="flex h-full overflow-x-auto">
      <div className="flex min-w-full gap-4 px-4 py-6">
        {sorted.map((event) => {
          const durationHours = Math.max(1, differenceInMinutes(new Date(event.end), new Date(event.start)) / 60);
          return (
            <div key={event.id} className="min-w-[220px] rounded-md border bg-background p-3 shadow-sm">
              <p className="text-sm font-semibold">{event.title}</p>
              <p className="text-xs text-muted-foreground">{format(parseISO(event.start), "MMM d, HH:mm")}</p>
              <p className="mt-2 text-xs">Duration: {durationHours.toFixed(1)}h</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function GanttView({ events }: { events: CalendarEvent[] }) {
  const sorted = useMemo(
    () => [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
    [events]
  );

  return (
    <div className="grid h-full grid-cols-[200px_1fr] overflow-hidden">
      <div className="border-r bg-muted/40 p-4 text-xs font-semibold uppercase text-muted-foreground">Items</div>
      <div className="relative">
        <div className="absolute inset-0 overflow-auto">
          <div className="grid grid-cols-1 gap-4 p-4">
            {sorted.map((event) => {
              const duration = Math.max(1, differenceInMinutes(new Date(event.end), new Date(event.start)) / 60);
              return (
                <div key={event.id} className="flex items-center gap-2">
                  <span className="w-48 truncate text-sm font-medium">{event.title}</span>
                  <div className="flex-1">
                    <div className="h-6 rounded-md bg-primary/40" style={{ width: `${Math.min(duration * 12, 100)}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function CalendarPageContent() {
  const {
    calendars,
    loading,
    error,
    refreshCalendars,
    toggleCalendarVisibility,
    setCalendarColor,
    subscribeToCalendar,
    unsubscribeFromCalendar,
    density,
    filters,
    savedFilters,
    activeFilterId,
    createSavedFilter,
    deleteSavedFilter,
    applySavedFilter,
    updateFilterGroups,
    searchQuery,
    setSearchQuery,
    searchTokens,
    setSearchTokens,
    notifications,
    setNotifications,
    integrations,
    connectCalendarIntegration,
    disconnectCalendarIntegration,
    syncCalendarIntegration,
    setIntegrationConflictPreference,
    automationRules,
    toggleAutomationRule,
    shareSettings,
    updateShareRole,
    removeShareTarget,
    addShareTarget,
    invitations,
    updateInvitationStatus,
    followers,
    removeFollower,
    comments,
    addComment,
    workingHours,
    holidays,
    outOfOffice,
    schedulingSuggestions,
    acceptSchedulingSuggestion,
    refreshSchedulingSuggestions,
    delegations,
    defaults,
    updateDefaultSetting,
    resetDefaults,
    governance,
    updateGovernanceSetting,
    documentation,
  } = useCalendarState();

  const visibleCalendars = useMemo(
    () => calendars.filter((calendar) => calendar.visible && calendar.subscribed),
    [calendars]
  );

  const [view, setView] = useState<CalendarView>((defaults.defaultView as CalendarView) ?? "week");
  const [pivot, setPivot] = useState(new Date());
  const [range, setRange] = useState<DateRange>(() => getRangeForView(view, pivot));
  const [colorEncoding, setColorEncoding] = useState<CalendarColorEncoding>(
    (defaults.colorEncoding as CalendarColorEncoding) ?? "calendar"
  );
  const [snapInterval, setSnapInterval] = useState<number>(defaults.snapMinutes);
  const [focusMode, setFocusMode] = useState(false);
  const [dualTimezone, setDualTimezone] = useState(false);
  const [secondaryTimezone, setSecondaryTimezone] = useState(defaults.defaultTimezone);
  const [zoom, setZoom] = useState(1);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [autoOffsetConflicts, setAutoOffsetConflicts] = useState(true);
  const [lockedResourceEvents, setLockedResourceEvents] = useState<string[]>([]);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [highlightCategory, setHighlightCategory] = useState<CalendarVisualCategory | null>(null);
  const [undoStack, setUndoStack] = useState<CalendarEvent[][]>([]);
  const [redoStack, setRedoStack] = useState<CalendarEvent[][]>([]);
  const [syncStatus, setSyncStatus] = useState<{
    state: "idle" | "syncing" | "offline" | "error";
    lastSyncedAt?: string;
    message?: string;
  }>({ state: "idle", message: "Calendar is up to date." });
  const [cacheMeta, setCacheMeta] = useState<{ lastCachedAt: string; count: number } | null>(null);
  const cacheLoadedRef = useRef(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [statusBanner, setStatusBanner] = useState<{ message: string; variant: "default" | "destructive" } | null>(null);
  const [offline, setOffline] = useState<boolean>(false);
  const handleLegendActivate = useCallback((category: CalendarVisualCategory | null) => {
    setHighlightCategory(category);
  }, []);

  const [gotoOpen, setGotoOpen] = useState(false);

  const headerLabel = useMemo(() => formatHeaderLabel(view, range), [view, range]);

  const rangeUnit: CalendarUnit = useMemo(() => {
    switch (view) {
      case "timeline":
      case "gantt":
        return "month";
      case "agenda":
        return "week";
      default:
        return view as CalendarUnit;
    }
  }, [view]);

  const { events: remoteEvents, isLoading, error: rangeError, refetch } = useCalendarRange({
    from: range.from,
    to: range.to,
    calendarIds: visibleCalendars.map((calendar) => calendar.id),
    colorEncoding,
  });

  const [events, setEvents] = useState<CalendarEvent[]>(remoteEvents);
  useEffect(() => {
    setEvents(remoteEvents);
  }, [remoteEvents]);

  useEffect(() => {
    setSearchTokens(parseSearchTokens(searchQuery));
  }, [searchQuery, setSearchTokens]);

  useEffect(() => {
    if (notifications.length === 0) {
      setNotifications((current) => (current.length === 0 ? [...MOCK_NOTIFICATIONS] : current));
    }
  }, [notifications.length, setNotifications]);

  const filteredEvents = useMemo(
    () => applyFiltersToEvents(events, filters, searchTokens),
    [events, filters, searchTokens]
  );

  const rangeErrorMessage = useMemo(() => {
    if (!rangeError) return null;
    if (rangeError instanceof Error) {
      return rangeError.message;
    }
    return "Failed to load calendar events.";
  }, [rangeError]);

  useEffect(() => {
    if (typeof window === "undefined" || cacheLoadedRef.current) {
      return;
    }
    cacheLoadedRef.current = true;
    try {
      const raw = window.localStorage.getItem(CALENDAR_CACHE_KEY);
      if (!raw) {
        return;
      }
      const parsed = JSON.parse(raw) as { events?: CalendarEvent[]; cachedAt?: string };
      if (parsed?.events && Array.isArray(parsed.events) && parsed.events.length > 0) {
        setEvents(parsed.events);
        if (parsed.cachedAt) {
          setCacheMeta({ lastCachedAt: parsed.cachedAt, count: parsed.events.length });
        }
      }
    } catch (error) {
      console.warn("Failed to restore cached calendar events", error);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const cachedAt = new Date().toISOString();
      const payload = JSON.stringify({ events, cachedAt });
      window.localStorage.setItem(CALENDAR_CACHE_KEY, payload);
      setCacheMeta({ lastCachedAt: cachedAt, count: events.length });
    } catch (error) {
      console.warn("Failed to cache calendar events", error);
    }
  }, [events]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const updateNetworkStatus = () => {
      setOffline(!navigator.onLine);
    };
    updateNetworkStatus();
    window.addEventListener("online", updateNetworkStatus);
    window.addEventListener("offline", updateNetworkStatus);
    return () => {
      window.removeEventListener("online", updateNetworkStatus);
      window.removeEventListener("offline", updateNetworkStatus);
    };
  }, []);

  useEffect(() => {
    if (rangeErrorMessage) {
      setStatusBanner({ message: rangeErrorMessage, variant: "destructive" });
      return;
    }
    if (offline) {
      setStatusBanner({ message: "You are offline. Viewing cached calendar data.", variant: "default" });
      return;
    }
    setStatusBanner(null);
  }, [offline, rangeErrorMessage]);

  useEffect(() => {
    if (offline) {
      setSyncStatus((current) => ({
        ...current,
        state: "offline",
        message: "Offline – displaying cached events.",
      }));
      return;
    }
    if (isLoading) {
      setSyncStatus((current) => ({
        ...current,
        state: "syncing",
        message: "Syncing latest updates…",
      }));
      return;
    }
    if (rangeErrorMessage) {
      setSyncStatus((current) => ({
        ...current,
        state: "error",
        message: rangeErrorMessage,
      }));
      return;
    }
    setSyncStatus({
      state: "idle",
      lastSyncedAt: new Date().toISOString(),
      message: "Calendar is up to date.",
    });
  }, [isLoading, offline, rangeErrorMessage]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z" && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) {
          handleUndo();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && (event.key.toLowerCase() === "z" && event.shiftKey)) {
        event.preventDefault();
        if (canRedo) {
          handleRedo();
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "g") {
        event.preventDefault();
        setGotoOpen(true);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "/") {
        event.preventDefault();
        setHelpOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [canRedo, canUndo, handleRedo, handleUndo]);

  const lastSyncedRelative = useMemo(() => {
    if (!syncStatus.lastSyncedAt) {
      return null;
    }
    return formatDistanceToNowStrict(parseISO(syncStatus.lastSyncedAt), { addSuffix: true });
  }, [syncStatus.lastSyncedAt]);

  const cacheRelative = useMemo(() => {
    if (!cacheMeta?.lastCachedAt) {
      return null;
    }
    return formatDistanceToNowStrict(parseISO(cacheMeta.lastCachedAt), { addSuffix: true });
  }, [cacheMeta?.lastCachedAt]);

  const visualCategoryCounts = useMemo(() => {
    const counts: Partial<Record<CalendarVisualCategory, number>> = {};
    filteredEvents.forEach((event) => {
      VISUAL_CATEGORIES.forEach((definition) => {
        if (eventMatchesVisualCategory(event, definition.id)) {
          counts[definition.id] = (counts[definition.id] ?? 0) + 1;
        }
      });
    });
    return counts;
  }, [filteredEvents]);

  const conflicts = useMemo(() => detectConflicts(filteredEvents), [filteredEvents]);

  const selectedEvents = useMemo(() => new Set(selectedEventIds), [selectedEventIds]);
  const lockedResourceEventSet = useMemo(
    () => new Set(lockedResourceEvents),
    [lockedResourceEvents]
  );

  const activeEvent = useMemo(() => events.find((event) => event.id === activeEventId) ?? null, [events, activeEventId]);

  const handleNavigate = useCallback(
    (direction: "prev" | "next" | "today") => {
      if (direction === "today") {
        const now = new Date();
        setPivot(now);
        setRange(getRangeForView(view, now));
        return;
      }
      const delta = direction === "prev" ? -1 : 1;
      let nextPivot = pivot;
      switch (view) {
        case "day":
          nextPivot = addDays(pivot, delta);
          break;
        case "work-week":
        case "week":
          nextPivot = addWeeks(pivot, delta);
          break;
        case "month":
        case "timeline":
        case "gantt":
          nextPivot = addMonths(pivot, delta);
          break;
        case "quarter":
          nextPivot = addMonths(pivot, delta * 3);
          break;
        case "year":
          nextPivot = addMonths(pivot, delta * 12);
          break;
        case "agenda":
          nextPivot = addWeeks(pivot, delta);
          break;
        default:
          nextPivot = addMonths(pivot, delta);
      }
      setPivot(nextPivot);
      setRange(getRangeForView(view, nextPivot));
    },
    [pivot, view]
  );

  useKeyboardNavigation({
    view,
    onNavigate: handleNavigate,
    onOpenGoto: () => setGotoOpen(true),
  });

  const hourHeight = useMemo(() => HOUR_HEIGHT_BY_DENSITY[density] * zoom, [density, zoom]);

  const commitEvents = useCallback(
    (updater: (events: CalendarEvent[]) => CalendarEvent[]) => {
      setEvents((current) => {
        const snapshot = cloneEventsForHistory(current);
        setUndoStack((stack) => [...stack.slice(-19), snapshot]);
        setRedoStack([]);
        return updater(current);
      });
    },
    []
  );

  const handleUndo = useCallback(() => {
    setUndoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      const previous = stack[stack.length - 1];
      setRedoStack((redo) => [...redo, cloneEventsForHistory(events)]);
      setEvents(previous);
      return stack.slice(0, -1);
    });
  }, [events]);

  const handleRedo = useCallback(() => {
    setRedoStack((stack) => {
      if (stack.length === 0) {
        return stack;
      }
      const next = stack[stack.length - 1];
      setUndoStack((undo) => [...undo, cloneEventsForHistory(events)]);
      setEvents(next);
      return stack.slice(0, -1);
    });
  }, [events]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  const handleSelectEvent = useCallback(
    (eventId: string, additive: boolean) => {
      setSelectedEventIds((current) => {
        if (additive) {
          return current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId];
        }
        return [eventId];
      });
    },
    []
  );

  const handleOpenDetail = useCallback((eventId: string) => {
    setActiveEventId(eventId);
  }, []);

  const handleJoinMeeting = useCallback((eventId: string) => {
    const event = events.find((item) => item.id === eventId);
    if (event?.videoLink) {
      window.open(event.videoLink, "_blank", "noopener,noreferrer");
    }
  }, [events]);

  const handleJoinFromNotification = useCallback(
    (eventId: string) => {
      handleJoinMeeting(eventId);
      setActiveEventId(eventId);
    },
    [handleJoinMeeting]
  );

  const handleRefresh = useCallback(() => {
    setSyncStatus((current) => ({
      ...current,
      state: offline ? "offline" : "syncing",
      message: offline ? "Offline – unable to sync." : "Syncing latest updates…",
    }));
    refreshCalendars();
    refetch();
    refreshSchedulingSuggestions();
  }, [offline, refetch, refreshCalendars, refreshSchedulingSuggestions]);

  const handleExport = useCallback(
    (options: CalendarExportOptions) => {
      setSyncStatus((current) => ({
        ...current,
        message: `Prepared ${options.format.toUpperCase()} export for ${filteredEvents.length} events.`,
      }));
      // Placeholder for actual export integration
      console.info("Calendar export requested", options);
    },
    [filteredEvents.length]
  );

  const handleOpenReports = useCallback(() => {
    window.open("/reports/calendar", "_blank", "noopener,noreferrer");
  }, []);

  const handleEventUpdate = useCallback((updated: CalendarEvent) => {
    const normalized: CalendarEvent = {
      ...updated,
      hasReminders: updated.hasReminders ?? (updated.reminders?.length ?? 0) > 0,
      hasAttachments: updated.hasAttachments ?? (updated.attachments?.length ?? 0) > 0,
    };
    commitEvents((current) => current.map((event) => (event.id === normalized.id ? normalized : event)));
  }, [commitEvents]);

  const handleSnoozeNotification = useCallback(
    (notificationId: string, minutes: number) => {
      const nextStart = new Date(Date.now() + minutes * 60 * 1000).toISOString();
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, start: nextStart, status: "snoozed" }
            : notification
        )
      );
    },
    [setNotifications]
  );

  const handleDismissNotification = useCallback(
    (notificationId: string) => {
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    },
    [setNotifications]
  );

  const handleEventDelete = useCallback((eventId: string) => {
    commitEvents((current) => current.filter((event) => event.id !== eventId));
    setSelectedEventIds((current) => current.filter((id) => id !== eventId));
    if (activeEventId === eventId) {
      setActiveEventId(null);
    }
  }, [activeEventId, commitEvents]);

  const handleAddComment = useCallback(() => {
    if (!activeEventId || commentDraft.trim().length === 0) {
      return;
    }
    const now = new Date().toISOString();
    const newComment: CalendarComment = {
      id: `comment-${Date.now()}`,
      eventId: activeEventId,
      authorId: "user-avery",
      authorName: "Avery",
      createdAt: now,
      body: commentDraft.trim(),
    };
    addComment(newComment);
    commitEvents((current) =>
      current.map((event) =>
        event.id === activeEventId
          ? { ...event, comments: [...(event.comments ?? []), newComment], updatedAt: now }
          : event
      )
    );
    setCommentDraft("");
  }, [activeEventId, addComment, commentDraft, commitEvents]);

  const handleQuickAdd = useCallback(() => {
    const parsed = parseQuickAddInput(quickAddValue, range.from);
    if (!parsed) return;
    const defaultCalendar = visibleCalendars[0]?.id ?? "calendar.personal";
    const newEvent = createEventFromQuickAdd(parsed, defaultCalendar);
    commitEvents((current) => [...current, newEvent]);
    setQuickAddValue("");
    setActiveEventId(newEvent.id);
  }, [commitEvents, quickAddValue, range.from, visibleCalendars]);

  const handleReassignOwner = useCallback(
    (eventId: string, ownerId: string) => {
      const person = MOCK_CALENDAR_PEOPLE.find((candidate) => candidate.id === ownerId);
      if (!person) return;
      const teamName = person.teamId
        ? person.teamId
            .replace("team-", "")
            .split("-")
            .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
            .join(" ")
        : undefined;
      commitEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                ownerId,
                ownerName: person.name,
                teamId: person.teamId ?? event.teamId,
                teamName: teamName ?? event.teamName,
                updatedAt: new Date().toISOString(),
              }
            : event
        )
      );
    },
    [commitEvents]
  );

  const handleToggleResourceLock = useCallback((eventId: string) => {
    setLockedResourceEvents((current) =>
      current.includes(eventId) ? current.filter((id) => id !== eventId) : [...current, eventId]
    );
  }, []);

  const handleBulkStatusChange = (status: CalendarEvent["status"]) => {
    commitEvents((current) =>
      current.map((event) => (selectedEvents.has(event.id) ? { ...event, status, updatedAt: new Date().toISOString() } : event))
    );
  };

  const handleBulkReminder = (offsetMinutes: number) => {
    commitEvents((current) =>
      current.map((event) =>
        selectedEvents.has(event.id)
          ? {
              ...event,
              reminders: [{ id: `rem-${Date.now()}`, offsetMinutes, method: "popup" }],
              hasReminders: true,
              metadata: { ...(event.metadata ?? {}), remindersMirrored: true },
            }
          : event
      )
    );
  };

  const handleMarkEventDone = useCallback(
    (eventId: string) => {
      const completedAt = new Date().toISOString();
      commitEvents((current) =>
        current.map((event) =>
          event.id === eventId
            ? {
                ...event,
                completed: true,
                metadata: { ...(event.metadata ?? {}), completedAt },
              }
            : event
        )
      );
      setNotifications((current) => current.filter((notification) => notification.eventId !== eventId));
    },
    [commitEvents, setNotifications]
  );

  const handleAgendaRsvp = useCallback(
    (invitationId: string, status: CalendarRSVPStatus) => {
      updateInvitationStatus(invitationId, status);
      commitEvents((current) =>
        current.map((event) =>
          event.invitations
            ? {
                ...event,
                invitations: event.invitations.map((invitation) =>
                  invitation.id === invitationId ? { ...invitation, status } : invitation
                ),
              }
            : event
        )
      );
    },
    [commitEvents, updateInvitationStatus]
  );

  const handleDeleteFilter = useCallback(
    (filterId: string) => {
      if (window.confirm("Delete this saved filter?")) {
        deleteSavedFilter(filterId);
      }
    },
    [deleteSavedFilter]
  );

  const handleSaveCurrentFilter = useCallback(() => {
    const name = window.prompt("Save filter as", "New filter");
    if (!name) return;
    const description = window.prompt("Description (optional)") ?? undefined;
    createSavedFilter({ name, description });
    setFilterPopoverOpen(false);
  }, [createSavedFilter, setFilterPopoverOpen]);

  const handleZoomWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((current) => {
      const next = current + (event.deltaY > 0 ? -0.1 : 0.1);
      return Math.min(Math.max(next, 0.6), 1.6);
    });
  };

  const handleDrop = useCallback(
    (eventId: string, mode: Exclude<DragMode, null>, target: Date) => {
      const event = events.find((item) => item.id === eventId);
      if (!event) return;
      const duration = differenceInMinutes(new Date(event.end), new Date(event.start));
      const snapped = roundToSnap(target, snapInterval);
      const withinDay = clampDateWithinDay(snapped, parseISO(event.start));
      if (mode === "move") {
        const newStart = withinDay;
        const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);
        commitEvents((current) =>
          current.map((item) =>
            item.id === eventId
              ? { ...item, start: newStart.toISOString(), end: newEnd.toISOString(), updatedAt: new Date().toISOString() }
              : item
          )
        );
      } else if (mode === "resize-start") {
        commitEvents((current) =>
          current.map((item) =>
            item.id === eventId
              ? { ...item, start: withinDay.toISOString(), updatedAt: new Date().toISOString() }
              : item
          )
        );
      } else if (mode === "resize-end") {
        const startDate = new Date(event.start);
        const candidate = withinDay > startDate ? withinDay : new Date(startDate.getTime() + snapInterval * 60 * 1000);
        const newEnd = candidate;
        commitEvents((current) =>
          current.map((item) =>
            item.id === eventId
              ? { ...item, end: newEnd.toISOString(), updatedAt: new Date().toISOString() }
              : item
          )
        );
      }
    },
    [commitEvents, events, snapInterval]
  );

  const handleDragStart = (_eventId: string, _mode: Exclude<DragMode, null>) => {
    // placeholder for analytics hooks
  };

  const conflictSignatureRef = useRef<string>("");

  useEffect(() => {
    if (!autoOffsetConflicts) return;
    const ids = Array.from(conflicts).sort();
    const signature = ids.join("|");
    if (!signature || signature === conflictSignatureRef.current) {
      return;
    }
    conflictSignatureRef.current = signature;
    commitEvents((current) => {
      const updated = [...current];
      for (const id of ids) {
        const index = updated.findIndex((event) => event.id === id);
        if (index === -1) continue;
        const event = updated[index];
        const start = new Date(event.start);
        start.setMinutes(start.getMinutes() + 5);
        const end = new Date(event.end);
        end.setMinutes(end.getMinutes() + 5);
        updated[index] = {
          ...event,
          start: start.toISOString(),
          end: end.toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      return updated;
    });
  }, [autoOffsetConflicts, commitEvents, conflicts]);

  useEffect(() => {
    if (conflicts.size === 0) {
      conflictSignatureRef.current = "";
    }
  }, [conflicts]);

  const workingStatus = useMemo(() => {
    const upcoming = events
      .filter((event) => new Date(event.start) > new Date())
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())[0];
    return upcoming ?? null;
  }, [events]);

  const renderMainView = (currentEvents: CalendarEvent[]) => {
    switch (view) {
      case "day":
      case "work-week":
      case "week": {
        const days = eachDayOfInterval(range);
        return (
          <div className="flex h-full flex-1 flex-col" onWheel={handleZoomWheel}>
            <div className="grid flex-1" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>
              {days.map((day) => (
                <DayCell
                  key={day.toISOString()}
                  date={day}
                  events={currentEvents.filter((event) => isSameDay(parseISO(event.start), day))}
                  onSelect={handleSelectEvent}
                  onOpenDetail={handleOpenDetail}
                  selectedEvents={selectedEvents}
                  colorEncoding={colorEncoding}
                  onJoinMeeting={handleJoinMeeting}
                  onDragStart={handleDragStart}
                  hourHeight={hourHeight}
                  snapMinutes={snapInterval}
                  focusMode={focusMode}
                  onDrop={handleDrop}
                  dualTimezone={dualTimezone}
                  secondaryTimezone={secondaryTimezone}
                  conflicts={conflicts}
                  onDeleteEvent={handleEventDelete}
                  highlightCategory={highlightCategory}
                />
              ))}
            </div>
          </div>
        );
      }
      case "month":
        return (
          <MonthView
            range={range}
            events={currentEvents}
            onSelect={handleSelectEvent}
            onOpenDetail={handleOpenDetail}
            selectedEvents={selectedEvents}
            colorEncoding={colorEncoding}
            onJoinMeeting={handleJoinMeeting}
            onDragStart={handleDragStart}
            conflicts={conflicts}
            onDeleteEvent={handleEventDelete}
            highlightCategory={highlightCategory}
          />
        );
      case "agenda":
        return (
          <AgendaView
            events={currentEvents}
            onSelect={handleSelectEvent}
            onOpenDetail={handleOpenDetail}
            selectedEvents={selectedEvents}
            colorEncoding={colorEncoding}
            onJoinMeeting={handleJoinMeeting}
            onDragStart={handleDragStart}
            onDeleteEvent={handleEventDelete}
            highlightCategory={highlightCategory}
          />
        );
      case "timeline":
        return <TimelineView events={currentEvents} />;
      case "gantt":
        return <GanttView events={currentEvents} />;
      case "year":
        return <YearView events={currentEvents} />;
      case "quarter":
        return <TimelineView events={currentEvents} />;
      case "people":
        return (
          <div className="grid h-full grid-cols-[2fr_1fr] gap-4 p-4">
            <PeopleScheduleView
              people={MOCK_CALENDAR_PEOPLE}
              events={currentEvents}
              availability={MOCK_AVAILABILITY}
              onOpenEvent={handleOpenDetail}
              onReassignOwner={handleReassignOwner}
              conflicts={conflicts}
              range={range}
            />
            <AvailabilityHeatmap events={currentEvents} availability={MOCK_AVAILABILITY} range={range} />
          </div>
        );
      case "resources":
        return (
          <ResourceScheduleView
            resources={MOCK_CALENDAR_RESOURCES}
            events={currentEvents}
            onOpenEvent={handleOpenDetail}
            onToggleLock={handleToggleResourceLock}
            lockedEvents={lockedResourceEventSet}
          />
        );
      default:
        return null;
    }
  };

  const renderDetailPanel = () => {
    if (!activeEvent) {
      return (
        <aside className="hidden w-80 flex-col border-l bg-card p-6 text-sm text-muted-foreground xl:flex">
          Select an event to see details.
        </aside>
      );
    }
    const eventInvitations =
      activeEvent.invitations && activeEvent.invitations.length > 0
        ? activeEvent.invitations
        : invitations.filter((invitation) => invitation.eventId === activeEvent.id);
    const eventComments =
      activeEvent.comments && activeEvent.comments.length > 0
        ? activeEvent.comments
        : comments.filter((comment) => comment.eventId === activeEvent.id);
    return (
      <aside className="hidden w-80 flex-col border-l bg-card xl:flex">
        <div className="border-b px-4 py-3">
          <h2 className="text-lg font-semibold">{activeEvent.title}</h2>
          <p className="text-xs text-muted-foreground">{format(parseISO(activeEvent.start), "MMM d, HH:mm")}</p>
        </div>
        <ScrollArea className="flex-1 px-4 py-4">
          <div className="space-y-4 text-sm">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={activeEvent.title}
                onChange={(event) => handleEventUpdate({ ...activeEvent, title: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Tabs defaultValue="markdown">
                <TabsList className="grid grid-cols-2">
                  <TabsTrigger value="markdown">Markdown</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
                <TabsContent value="markdown" className="pt-3">
                  <textarea
                    className="h-32 w-full rounded-md border bg-background p-2"
                    value={activeEvent.description ?? ""}
                    onChange={(event) => handleEventUpdate({ ...activeEvent, description: event.target.value })}
                  />
                </TabsContent>
                <TabsContent value="preview" className="pt-3 text-sm">
                  {activeEvent.description ? (
                    <p className="whitespace-pre-wrap">{activeEvent.description}</p>
                  ) : (
                    <p className="text-muted-foreground">No description</p>
                  )}
                </TabsContent>
              </Tabs>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
              <div>
                <p className="font-medium text-foreground">Start</p>
                <p>{format(parseISO(activeEvent.start), "MMM d, HH:mm")}</p>
              </div>
              <div>
                <p className="font-medium text-foreground">End</p>
                <p>{format(parseISO(activeEvent.end), "MMM d, HH:mm")}</p>
              </div>
            </div>
            {activeEvent.videoLink && (
              <Button size="sm" onClick={() => handleJoinMeeting(activeEvent.id)}>
                Join video call
              </Button>
            )}
            <div className="space-y-2">
              <Label>Linked items</Label>
              <div className="space-y-2">
                {(activeEvent.linkedItems ?? []).map((link) => (
                  <div key={link.id} className="flex items-center gap-2 rounded-md border px-2 py-1">
                    <Link2 className="h-4 w-4" />
                    <span>{link.label}</span>
                  </div>
                ))}
                {(activeEvent.linkedItems ?? []).length === 0 && (
                  <p className="text-xs text-muted-foreground">No linked items</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Attachments</Label>
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
                Drag files here to attach (mocked).
              </div>
            </div>
            <div className="space-y-2">
              <Label>Invitations & RSVP</Label>
              <div className="space-y-2 text-xs">
                {eventInvitations.length === 0 ? (
                  <p className="text-muted-foreground">No invitations tracked.</p>
                ) : (
                  eventInvitations.map((invitation) => (
                    <div key={invitation.id} className="flex items-center justify-between rounded-md border bg-muted/20 px-2 py-1">
                      <div>
                        <p className="font-medium text-foreground">{invitation.invitee.name}</p>
                        <p className="text-muted-foreground">{invitation.invitee.email}</p>
                      </div>
                      <Badge variant={invitation.status === "accepted" ? "secondary" : "outline"}>{invitation.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Comments</Label>
              <div className="space-y-2 text-xs">
                {eventComments.length === 0 ? (
                  <p className="text-muted-foreground">No comments yet.</p>
                ) : (
                  eventComments.map((comment) => (
                    <div key={comment.id} className="rounded-md border bg-muted/10 p-2">
                      <p className="font-medium text-foreground">{comment.authorName}</p>
                      <p className="text-muted-foreground">{format(parseISO(comment.createdAt), "MMM d, HH:mm")}</p>
                      <p className="mt-1 whitespace-pre-wrap">{comment.body}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="space-y-2">
                <textarea
                  className="h-20 w-full rounded-md border bg-background p-2 text-xs"
                  value={commentDraft}
                  onChange={(event) => setCommentDraft(event.target.value)}
                  placeholder="Add a comment with @mentions"
                />
                <Button size="sm" onClick={handleAddComment} disabled={commentDraft.trim().length === 0}>
                  Post comment
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Audit trail</Label>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Created {activeEvent.createdAt ? format(parseISO(activeEvent.createdAt), "MMM d, HH:mm") : "recently"}</li>
                <li>Updated {activeEvent.updatedAt ? format(parseISO(activeEvent.updatedAt), "MMM d, HH:mm") : "just now"}</li>
              </ul>
            </div>
            <NotificationCenter
              notifications={notifications}
              onSnooze={handleSnoozeNotification}
              onDismiss={handleDismissNotification}
              onJoin={handleJoinFromNotification}
            />
          </div>
        </ScrollArea>
        <div className="border-t p-4">
          <Button variant="outline" className="w-full" onClick={() => setIsEditorOpen(true)}>
            Open full editor
          </Button>
        </div>
      </aside>
    );
  };

  return (
    <div className="flex h-full w-full flex-1 flex-col">
      <div className="flex h-full flex-1 overflow-hidden">
        <CalendarLeftRail
          calendars={calendars}
          loading={loading}
          error={error}
          onRefresh={refreshCalendars}
          onToggleVisibility={toggleCalendarVisibility}
          onColorChange={setCalendarColor}
          onSubscribe={subscribeToCalendar}
          onUnsubscribe={unsubscribeFromCalendar}
          colorEncoding={colorEncoding}
          onColorEncodingChange={setColorEncoding}
          savedFilters={savedFilters}
          activeFilterId={activeFilterId}
          onApplyFilter={applySavedFilter}
          onDeleteFilter={handleDeleteFilter}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          {statusBanner && (
            <div className="px-4 pt-4 lg:px-6">
              <Alert variant={statusBanner.variant}>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Calendar status</AlertTitle>
                <AlertDescription>{statusBanner.message}</AlertDescription>
              </Alert>
            </div>
          )}
          <div className="px-4 pt-4 lg:hidden">
            <CalendarMobileShell events={filteredEvents} onOpenEvent={handleOpenDetail} />
          </div>
          <div className="space-y-4 border-b bg-background/95 px-6 py-4 shadow-sm">
            <div className="flex flex-wrap items-center gap-3">
              <ViewSwitch value={view} onChange={(next) => {
                setView(next);
                setRange(getRangeForView(next, pivot));
              }} />
              <DateRangeControls unit={rangeUnit} range={range} onChange={(next) => {
                setRange(next);
                setPivot(next.from);
              }} />
              <Popover open={gotoOpen} onOpenChange={setGotoOpen}>
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
                      if (!date) return;
                      setPivot(date);
                      setRange(getRangeForView(view, date));
                      setGotoOpen(false);
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <div className="ml-auto flex items-center gap-3">
                <Button variant="ghost" size="icon" onClick={() => handleNavigate("prev")} aria-label="Previous">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={() => handleNavigate("today")}>
                  Today
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleNavigate("next")} aria-label="Next">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleUndo} disabled={!canUndo}>
                <Undo2 className="mr-2 h-4 w-4" />Undo
              </Button>
              <Button variant="outline" size="sm" onClick={handleRedo} disabled={!canRedo}>
                <Redo2 className="mr-2 h-4 w-4" />Redo
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />Refresh
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setHelpOpen(true)}>
                <HelpCircle className="mr-2 h-4 w-4" />Shortcuts
              </Button>
            </div>
            <div className="text-sm font-semibold text-muted-foreground">{headerLabel}</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search events or use @mention, #project, tag:label"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Snap</Label>
                <Select value={String(snapInterval)} onValueChange={(value) => setSnapInterval(Number(value))}>
                  <SelectTrigger className="w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SNAP_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {option} min
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter className="h-4 w-4" /> Filters
                    {activeFilterId && <Badge variant="secondary">Saved</Badge>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] space-y-4 p-4" align="end">
                  <FilterBuilder groups={filters} onChange={updateFilterGroups} />
                  <div className="flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={() => applySavedFilter(null)}>
                      Reset
                    </Button>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={handleSaveCurrentFilter}>
                        Save filter
                      </Button>
                      <Button variant="default" size="sm" onClick={() => setFilterPopoverOpen(false)}>
                        Close
                      </Button>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={focusMode} onCheckedChange={setFocusMode} id="focus-mode" />
                <Label htmlFor="focus-mode">Focus mode</Label>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={dualTimezone} onCheckedChange={setDualTimezone} id="dual-timezone" />
                <Label htmlFor="dual-timezone">Dual time zone</Label>
              </div>
              {dualTimezone && (
                <Input
                  className="w-40"
                  value={secondaryTimezone}
                  onChange={(event) => setSecondaryTimezone(event.target.value)}
                  placeholder="Secondary TZ"
                />
              )}
            </div>
            {searchTokens.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {searchTokens.map((token) => (
                  <Badge key={token.id} variant="outline">
                    {token.display}
                  </Badge>
                ))}
                <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                  Clear search
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/30 px-4 py-2 text-xs" role="status">
              <span className="flex items-center gap-2 text-foreground">
                {syncStatus.state === "offline" ? (
                  <WifiOff className="h-3 w-3" />
                ) : (
                  <RefreshCw
                    className={cn("h-3 w-3", syncStatus.state === "syncing" && "animate-spin")}
                  />
                )}
                <span>{syncStatus.message ?? ""}</span>
              </span>
              {lastSyncedRelative && (
                <span className="text-muted-foreground">Last sync {lastSyncedRelative}</span>
              )}
              {cacheMeta && cacheRelative && (
                <span className="text-muted-foreground">
                  Cached {cacheMeta.count} events {cacheRelative}
                </span>
              )}
            </div>
            <div className="hidden gap-4 lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <AgendaPane
                events={filteredEvents}
                notifications={notifications}
                onJoin={handleJoinMeeting}
                onSnooze={handleSnoozeNotification}
                onDismiss={handleDismissNotification}
                onRsvp={handleAgendaRsvp}
                onMarkDone={handleMarkEventDone}
              />
              <div className="grid gap-4">
                <CalendarLegend
                  counts={visualCategoryCounts}
                  activeCategory={highlightCategory}
                  onActivate={handleLegendActivate}
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Input
                className="flex-1"
                placeholder="Quick add e.g. 'Team sync tomorrow 2pm-3pm #team'"
                value={quickAddValue}
                onChange={(event) => setQuickAddValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleQuickAdd();
                  }
                }}
              />
              <Button onClick={handleQuickAdd}>
                <Plus className="mr-2 h-4 w-4" />Quick add
              </Button>
            </div>
            {selectedEventIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3 text-xs">
                <span className="font-semibold">Bulk actions ({selectedEventIds.length})</span>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange("confirmed")}>Mark confirmed</Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange("tentative")}>Mark tentative</Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkReminder(15)}>Reminder 15m</Button>
              </div>
            )}
          </div>
          <div className="flex flex-1 overflow-hidden">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="flex items-center justify-between border-b px-6 py-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Layers className="h-3 w-3" />
                  {visibleCalendars.length} calendars visible
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {filteredEvents.length} events
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="h-3 w-3" />
                  Snap {snapInterval}m
                </div>
                <div className="flex items-center gap-2">
                  <MousePointer2 className="h-3 w-3" />
                  Zoom {(zoom * 100).toFixed(0)}%
                </div>
                <div className="flex items-center gap-2">
                  <Share2 className="h-3 w-3" />
                  Auto-offset {autoOffsetConflicts ? "on" : "off"}
                  <Switch checked={autoOffsetConflicts} onCheckedChange={setAutoOffsetConflicts} />
                </div>
              </div>
              <div className="relative flex flex-1 overflow-hidden">
                {isLoading ? (
                  <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                    Loading events…
                  </div>
                ) : (
                  renderMainView(filteredEvents)
                )}
              </div>
            </div>
            {renderDetailPanel()}
          </div>
          <div className="grid gap-4 border-t bg-muted/20 px-6 py-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            <IntegrationManager
              integrations={integrations}
              onConnect={connectCalendarIntegration}
              onDisconnect={disconnectCalendarIntegration}
              onSync={syncCalendarIntegration}
              onChangePreference={setIntegrationConflictPreference}
            />
            <AutomationRulesPanel rules={automationRules} onToggle={toggleAutomationRule} />
            <SharingPermissionsPanel
              shareSettings={shareSettings}
              invitations={invitations}
              followers={followers}
              delegations={delegations}
              onUpdateRole={updateShareRole}
              onRemoveShare={removeShareTarget}
              onAddShare={addShareTarget}
              onUpdateInvitation={updateInvitationStatus}
              onRemoveFollower={removeFollower}
            />
            <SchedulingAssistantPanel
              suggestions={schedulingSuggestions}
              workingHours={workingHours}
              holidays={holidays}
              outOfOffice={outOfOffice}
              onAcceptSuggestion={acceptSchedulingSuggestion}
              onRefresh={refreshSchedulingSuggestions}
            />
            <CalendarAnalyticsPanel events={filteredEvents} onOpenReports={handleOpenReports} />
            <CalendarExportPanel onExport={handleExport} />
            <CalendarAdminPanel
              defaults={defaults}
              onUpdateDefault={updateDefaultSetting}
              onResetDefaults={resetDefaults}
              governance={governance}
              onUpdateGovernance={updateGovernanceSetting}
              documentation={documentation}
            />
          </div>
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t bg-background/80 px-6 py-3 text-xs text-muted-foreground">
            <span>Primary time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
            <span>Next event: {workingStatus ? `${workingStatus.title} at ${format(parseISO(workingStatus.start), "HH:mm")}` : "None"}</span>
            <span>Working hours: {WORKING_HOURS.start}:00 – {WORKING_HOURS.end}:00</span>
          </footer>
        </div>
      </div>
      <EventEditorDialog
        open={isEditorOpen}
        onOpenChange={setIsEditorOpen}
        event={activeEvent}
        onSave={(event) => handleEventUpdate(event)}
        onDelete={handleEventDelete}
      />
      <AlertDialog open={helpOpen} onOpenChange={setHelpOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Keyboard shortcuts</AlertDialogTitle>
            <AlertDialogDescription>
              Use these shortcuts to navigate and manage the calendar efficiently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span>Move between periods</span>
              <span className="flex items-center gap-2">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">←</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">→</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Jump to today</span>
              <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">T</kbd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Open go to date</span>
              <span className="flex items-center gap-2">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">G</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Undo / Redo</span>
              <span className="flex items-center gap-2">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Z</kbd>
                <span>/</span>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Shift</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Z</kbd>
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span>Open shortcut help</span>
              <span className="flex items-center gap-2">
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">Ctrl</kbd>
                <kbd className="rounded border bg-muted px-1.5 py-0.5 text-xs">/</kbd>
              </span>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
