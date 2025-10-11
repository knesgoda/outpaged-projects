import { useMemo, useState, type CSSProperties } from "react";
import { differenceInCalendarDays, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type {
  CalendarColorEncoding,
  CalendarEvent,
  CalendarEventStatus,
  CalendarVisualCategory,
} from "@/types/calendar";
import { describeVisualAffordances, eventMatchesVisualCategory } from "./visualEncoding";

const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  cancelled: "Cancelled",
  milestone: "Milestone",
  busy: "Busy",
};

function toRgba(color: string, alpha: number) {
  if (!color.startsWith("#")) {
    return color;
  }
  let r = 0;
  let g = 0;
  let b = 0;
  if (color.length === 7) {
    r = parseInt(color.slice(1, 3), 16);
    g = parseInt(color.slice(3, 5), 16);
    b = parseInt(color.slice(5, 7), 16);
  } else if (color.length === 4) {
    r = parseInt(color[1] + color[1], 16);
    g = parseInt(color[2] + color[2], 16);
    b = parseInt(color[3] + color[3], 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function priorityIntensity(priority?: CalendarEvent["priority"], baseColor?: string) {
  if (!priority || !baseColor) return undefined;
  const alpha = priority === "critical" ? 0.45 : priority === "high" ? 0.3 : 0.18;
  return toRgba(baseColor, alpha);
}

interface EventCardProps {
  event: CalendarEvent;
  isSelected?: boolean;
  colorEncoding: CalendarColorEncoding;
  onSelect: (eventId: string, additive: boolean) => void;
  onOpenDetail: (eventId: string) => void;
  onJoinMeeting?: (eventId: string) => void;
  draggable?: boolean;
  onDragStart?: (eventId: string, mode: "move" | "resize-start" | "resize-end") => void;
  highlightCategory?: CalendarVisualCategory | null;
}

export function EventCard({
  event,
  isSelected,
  colorEncoding,
  onSelect,
  onOpenDetail,
  onJoinMeeting,
  draggable = true,
  onDragStart,
  highlightCategory = null,
}: EventCardProps) {
  const [showHandles, setShowHandles] = useState(false);
  const baseColor = useMemo(() => {
    if (event.color) {
      return event.color;
    }
    if (colorEncoding === "custom" && event.metadata?.customColor && typeof event.metadata.customColor === "string") {
      return event.metadata.customColor;
    }
    return undefined;
  }, [event.color, event.metadata, colorEncoding]);
  const resolvedColor = baseColor ?? "#2563eb";
  const statusLabel = event.status ? STATUS_LABELS[event.status] : undefined;
  const matchesHighlight = !highlightCategory || eventMatchesVisualCategory(event, highlightCategory);
  const start = parseISO(event.start);
  const end = parseISO(event.end);
  const multiDay = differenceInCalendarDays(end, start) >= 1 || Boolean(event.allDay);
  const showMilestone = event.type === "milestone" || event.status === "milestone";
  const showReleaseBand = event.type === "release" || Boolean(event.isReleaseWindow);
  const showDeadline = Boolean(event.isDeadline);
  const descriptionId = `event-visual-${event.id}`;
  const visualDescription = describeVisualAffordances(event);

  const cardStyle = useMemo(() => {
    const style: CSSProperties = {
      borderColor: baseColor ?? resolvedColor,
    };
    const patterns: string[] = [];
    const patternSizes: string[] = [];

    if (event.status === "tentative") {
      const stripe = toRgba(resolvedColor, 0.35);
      patterns.push(`repeating-linear-gradient(135deg, ${stripe} 0px, ${stripe} 6px, transparent 6px, transparent 12px)`);
      patternSizes.push("12px 12px");
      style.backgroundColor = toRgba(resolvedColor, 0.08);
    } else {
      style.backgroundColor = priorityIntensity(event.priority, resolvedColor) ?? toRgba(resolvedColor, 0.12);
    }

    if (event.isRecurringException || (event.recurrenceExceptions?.length ?? 0) > 0) {
      patterns.push(`radial-gradient(${toRgba(resolvedColor, 0.55)} 20%, transparent 21%)`);
      patternSizes.push("10px 10px");
    }

    if (multiDay) {
      const hatch = toRgba("#64748b", 0.2);
      const hatchLight = toRgba("#94a3b8", 0.2);
      patterns.push(`repeating-linear-gradient(45deg, transparent 0, transparent 6px, ${hatch} 6px, ${hatch} 8px)`);
      patternSizes.push("10px 10px");
      patterns.push(`repeating-linear-gradient(-45deg, transparent 0, transparent 6px, ${hatchLight} 6px, ${hatchLight} 8px)`);
      patternSizes.push("10px 10px");
    }

    if (patterns.length > 0) {
      style.backgroundImage = patterns.join(", ");
      style.backgroundSize = patternSizes.join(", ");
    }

    if (event.priority === "high" || event.priority === "critical") {
      style.boxShadow = `inset 0 -2px 0 0 ${toRgba(resolvedColor, event.priority === "critical" ? 0.6 : 0.4)}`;
    }

    if (event.completed) {
      style.opacity = 0.5;
    }

    if (event.type === "focus" || event.type === "availability") {
      style.borderStyle = "dashed";
      style.filter = "saturate(0.85)";
    }

    return style;
  }, [baseColor, resolvedColor, event.status, event.priority, event.recurrenceExceptions, event.isRecurringException, event.completed, event.type, multiDay]);

  const handleSelect = (shiftKey: boolean, metaKey: boolean) => {
    onSelect(event.id, shiftKey || metaKey);
  };

  const handleDragStart = (mode: "move" | "resize-start" | "resize-end") => {
    if (!onDragStart) return;
    onDragStart(event.id, mode);
  };

  return (
    <TooltipProvider delayDuration={250} disableHoverableContent>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            role="button"
            tabIndex={0}
            className={cn(
              "group relative flex cursor-pointer flex-col gap-1 rounded-md border px-3 py-2 text-left text-xs transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              isSelected ? "border-primary shadow-lg" : "border-border",
              event.status === "cancelled" && "opacity-60 line-through",
              !matchesHighlight && "opacity-40"
            )}
            style={cardStyle}
            draggable={draggable}
            data-event-id={event.id}
            data-highlighted={matchesHighlight}
            aria-describedby={descriptionId}
            onClick={(e) => {
              handleSelect(e.shiftKey, e.metaKey || e.ctrlKey);
              onOpenDetail(event.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleSelect(e.shiftKey, e.metaKey || e.ctrlKey);
                onOpenDetail(event.id);
              }
            }}
            onFocus={() => setShowHandles(true)}
            onBlur={() => setShowHandles(false)}
            onMouseEnter={() => setShowHandles(true)}
            onMouseLeave={() => setShowHandles(false)}
          >
            {showReleaseBand && (
              <span className="pointer-events-none absolute inset-x-1 top-1 h-1 rounded-full bg-amber-400/80" aria-hidden="true" />
            )}
            {showDeadline && (
              <span className="pointer-events-none absolute inset-y-2 left-1 w-1 rounded-full bg-destructive" aria-hidden="true" />
            )}
            {showMilestone && (
              <span className="pointer-events-none absolute -right-1 -top-1 text-lg text-purple-500" aria-hidden="true">
                ◆
              </span>
            )}
            <span id={descriptionId} className="sr-only">
              {visualDescription}
            </span>
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-2 font-medium text-sm">{event.title}</span>
              {statusLabel && <Badge variant="secondary">{statusLabel}</Badge>}
              {(event.type === "focus" || event.type === "availability") && (
                <Badge variant="outline">Focus</Badge>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
              <span>
                {new Date(event.start).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {event.allDay ? " • All day" : ""}
              </span>
              {!event.allDay && (
                <span>
                  –
                  {" "}
                  {new Date(event.end).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              )}
              {event.location && <span className="truncate">• {event.location}</span>}
            </div>
            {event.videoLink && (
              <Button
                size="sm"
                variant="secondary"
                className="mt-1 w-fit text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onJoinMeeting?.(event.id);
                }}
              >
                Join call
              </Button>
            )}

            {showHandles && draggable && (
              <>
                <button
                  className="absolute inset-x-1 top-0 h-1 cursor-row-resize rounded-full bg-muted"
                  aria-label="Resize event earlier"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/calendar-event", JSON.stringify({ id: event.id, mode: "resize-start" }));
                    handleDragStart("resize-start");
                  }}
                />
                <button
                  className="absolute inset-x-1 bottom-0 h-1 cursor-row-resize rounded-full bg-muted"
                  aria-label="Resize event later"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/calendar-event", JSON.stringify({ id: event.id, mode: "resize-end" }));
                    handleDragStart("resize-end");
                  }}
                />
              </>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs text-sm">
          <div className="space-y-1">
            <p className="font-medium">{event.title}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(event.start).toLocaleString()} – {new Date(event.end).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </p>
            {event.attendees && event.attendees.length > 0 && (
              <p className="text-xs">
                {event.attendees.length} attendee{event.attendees.length === 1 ? "" : "s"}
              </p>
            )}
            {event.description && <p className="text-xs text-muted-foreground line-clamp-3">{event.description}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
