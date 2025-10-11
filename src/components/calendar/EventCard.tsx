import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CalendarColorEncoding, CalendarEvent, CalendarEventStatus } from "@/types/calendar";

const STATUS_LABELS: Record<CalendarEventStatus, string> = {
  confirmed: "Confirmed",
  tentative: "Tentative",
  cancelled: "Cancelled",
  milestone: "Milestone",
  busy: "Busy",
};

interface EventCardProps {
  event: CalendarEvent;
  isSelected?: boolean;
  colorEncoding: CalendarColorEncoding;
  onSelect: (eventId: string, additive: boolean) => void;
  onOpenDetail: (eventId: string) => void;
  onJoinMeeting?: (eventId: string) => void;
  draggable?: boolean;
  onDragStart?: (eventId: string, mode: "move" | "resize-start" | "resize-end") => void;
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
}: EventCardProps) {
  const [showHandles, setShowHandles] = useState(false);
  const background = useMemo(() => {
    if (event.color) {
      return event.color;
    }
    if (colorEncoding === "custom" && event.metadata?.customColor && typeof event.metadata.customColor === "string") {
      return event.metadata.customColor;
    }
    return undefined;
  }, [event.color, event.metadata, colorEncoding]);

  const statusLabel = event.status ? STATUS_LABELS[event.status] : undefined;

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
              event.status === "tentative" && "bg-muted/60",
              event.status === "cancelled" && "opacity-60 line-through"
            )}
            style={{
              background:
                event.status === "tentative"
                  ? undefined
                  : background
                  ? `${background}22`
                  : undefined,
              borderColor: background ?? undefined,
            }}
            draggable={draggable}
            data-event-id={event.id}
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
            <div className="flex items-center justify-between gap-2">
              <span className="line-clamp-2 font-medium text-sm">{event.title}</span>
              {statusLabel && <Badge variant="secondary">{statusLabel}</Badge>}
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
