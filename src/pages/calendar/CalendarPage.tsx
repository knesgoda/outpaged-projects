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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DateRangeControls, type CalendarUnit, type DateRange } from "@/components/common/DateRangeControls";
import { ViewSwitch, type CalendarView } from "@/components/common/ViewSwitch";
import { useCalendarRange } from "@/hooks/useCalendar";
import { EventCard } from "@/components/calendar/EventCard";
import { EventContextMenu } from "@/components/calendar/EventContextMenu";
import { EventEditorDialog } from "@/components/calendar/EventEditorDialog";
import { VirtualizedList } from "@/components/calendar/VirtualizedList";
import { CalendarProvider, useCalendarState } from "@/state/calendar";
import type { CalendarColorEncoding, CalendarEvent, CalendarLayer } from "@/types/calendar";

const WEEK_OPTIONS = { weekStartsOn: 1 as const };

const HOUR_HEIGHT_BY_DENSITY: Record<string, number> = {
  compact: 40,
  comfortable: 56,
  spacious: 72,
};

const SNAP_OPTIONS = [5, 15, 30];

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

interface QuickAddResult {
  title: string;
  start: Date;
  end: Date;
  calendarId?: string;
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
}: {
  events: CalendarEvent[];
  onSelect: (id: string, additive: boolean) => void;
  onOpenDetail: (id: string) => void;
  selectedEvents: Set<string>;
  colorEncoding: CalendarColorEncoding;
  onJoinMeeting: (id: string) => void;
  onDragStart: (eventId: string, mode: Exclude<DragMode, null>) => void;
  onDeleteEvent: (id: string) => void;
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
  } = useCalendarState();

  const visibleCalendars = useMemo(
    () => calendars.filter((calendar) => calendar.visible && calendar.subscribed),
    [calendars]
  );

  const [view, setView] = useState<CalendarView>("week");
  const [pivot, setPivot] = useState(new Date());
  const [range, setRange] = useState<DateRange>(() => getRangeForView(view, pivot));
  const [colorEncoding, setColorEncoding] = useState<CalendarColorEncoding>("calendar");
  const [snapInterval, setSnapInterval] = useState<number>(15);
  const [focusMode, setFocusMode] = useState(false);
  const [dualTimezone, setDualTimezone] = useState(false);
  const [secondaryTimezone, setSecondaryTimezone] = useState("UTC");
  const [zoom, setZoom] = useState(1);
  const [quickAddValue, setQuickAddValue] = useState("");
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [autoOffsetConflicts, setAutoOffsetConflicts] = useState(true);

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

  const { events: remoteEvents, isLoading } = useCalendarRange({
    from: range.from,
    to: range.to,
    calendarIds: visibleCalendars.map((calendar) => calendar.id),
    colorEncoding,
  });

  const [events, setEvents] = useState<CalendarEvent[]>(remoteEvents);
  useEffect(() => {
    setEvents(remoteEvents);
  }, [remoteEvents]);

  const conflicts = useMemo(() => detectConflicts(events), [events]);

  const selectedEvents = useMemo(() => new Set(selectedEventIds), [selectedEventIds]);

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

  const handleEventUpdate = useCallback((updated: CalendarEvent) => {
    setEvents((current) => current.map((event) => (event.id === updated.id ? updated : event)));
  }, []);

  const handleEventDelete = useCallback((eventId: string) => {
    setEvents((current) => current.filter((event) => event.id !== eventId));
    setSelectedEventIds((current) => current.filter((id) => id !== eventId));
    if (activeEventId === eventId) {
      setActiveEventId(null);
    }
  }, [activeEventId]);

  const handleQuickAdd = useCallback(() => {
    const parsed = parseQuickAddInput(quickAddValue, range.from);
    if (!parsed) return;
    const defaultCalendar = visibleCalendars[0]?.id ?? "calendar.personal";
    const newEvent = createEventFromQuickAdd(parsed, defaultCalendar);
    setEvents((current) => [...current, newEvent]);
    setQuickAddValue("");
    setActiveEventId(newEvent.id);
  }, [quickAddValue, range.from, visibleCalendars]);

  const handleBulkStatusChange = (status: CalendarEvent["status"]) => {
    setEvents((current) =>
      current.map((event) => (selectedEvents.has(event.id) ? { ...event, status, updatedAt: new Date().toISOString() } : event))
    );
  };

  const handleBulkReminder = (offsetMinutes: number) => {
    setEvents((current) =>
      current.map((event) =>
        selectedEvents.has(event.id)
          ? {
              ...event,
              reminders: [{ id: `rem-${Date.now()}`, offsetMinutes, method: "popup" }],
            }
          : event
      )
    );
  };

  const handleZoomWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    if (!event.ctrlKey && !event.metaKey) return;
    event.preventDefault();
    setZoom((current) => {
      const next = current + (event.deltaY > 0 ? -0.1 : 0.1);
      return Math.min(Math.max(next, 0.6), 1.6);
    });
  };

  const handleDrop = (eventId: string, mode: Exclude<DragMode, null>, target: Date) => {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;
    const duration = differenceInMinutes(new Date(event.end), new Date(event.start));
    const snapped = roundToSnap(target, snapInterval);
    const withinDay = clampDateWithinDay(snapped, parseISO(event.start));
    if (mode === "move") {
      const newStart = withinDay;
      const newEnd = new Date(newStart.getTime() + duration * 60 * 1000);
      setEvents((current) =>
        current.map((item) =>
          item.id === eventId
            ? { ...item, start: newStart.toISOString(), end: newEnd.toISOString(), updatedAt: new Date().toISOString() }
            : item
        )
      );
    } else if (mode === "resize-start") {
      setEvents((current) =>
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
      setEvents((current) =>
        current.map((item) =>
          item.id === eventId
            ? { ...item, end: newEnd.toISOString(), updatedAt: new Date().toISOString() }
            : item
        )
      );
    }
  };

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
    setEvents((current) => {
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
  }, [autoOffsetConflicts, conflicts]);

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

  const renderMainView = () => {
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
                  events={events.filter((event) => isSameDay(parseISO(event.start), day))}
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
            events={events}
            onSelect={handleSelectEvent}
            onOpenDetail={handleOpenDetail}
            selectedEvents={selectedEvents}
            colorEncoding={colorEncoding}
            onJoinMeeting={handleJoinMeeting}
            onDragStart={handleDragStart}
            conflicts={conflicts}
            onDeleteEvent={handleEventDelete}
          />
        );
      case "agenda":
        return (
          <AgendaView
            events={events}
            onSelect={handleSelectEvent}
            onOpenDetail={handleOpenDetail}
            selectedEvents={selectedEvents}
            colorEncoding={colorEncoding}
            onJoinMeeting={handleJoinMeeting}
            onDragStart={handleDragStart}
            onDeleteEvent={handleEventDelete}
          />
        );
      case "timeline":
        return <TimelineView events={events} />;
      case "gantt":
        return <GanttView events={events} />;
      case "year":
        return <YearView events={events} />;
      case "quarter":
        return <TimelineView events={events} />;
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
              <Label>Audit trail</Label>
              <ul className="space-y-1 text-xs text-muted-foreground">
                <li>Created {activeEvent.createdAt ? format(parseISO(activeEvent.createdAt), "MMM d, HH:mm") : "recently"}</li>
                <li>Updated {activeEvent.updatedAt ? format(parseISO(activeEvent.updatedAt), "MMM d, HH:mm") : "just now"}</li>
              </ul>
            </div>
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
        />
        <div className="flex min-w-0 flex-1 flex-col">
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
            <div className="text-sm font-semibold text-muted-foreground">{headerLabel}</div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input className="pl-9" placeholder="Search events" />
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
                  {events.length} events
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
                  renderMainView()
                )}
              </div>
            </div>
            {renderDetailPanel()}
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
