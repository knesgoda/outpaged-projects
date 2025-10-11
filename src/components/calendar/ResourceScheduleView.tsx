import { differenceInMinutes, format, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CalendarEvent, CalendarResource } from "@/types/calendar";
import { Lock, Unlock } from "lucide-react";

interface ResourceScheduleViewProps {
  resources: CalendarResource[];
  events: CalendarEvent[];
  onOpenEvent: (eventId: string) => void;
  onToggleLock: (eventId: string) => void;
  lockedEvents: Set<string>;
}

function getEventsForResource(events: CalendarEvent[], resourceId: string) {
  return events.filter((event) => event.resourceIds?.includes(resourceId));
}

export function ResourceScheduleView({ resources, events, onOpenEvent, onToggleLock, lockedEvents }: ResourceScheduleViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b px-4 py-3">
        <h2 className="text-sm font-semibold">Room & resource view</h2>
        <p className="text-xs text-muted-foreground">Review bookings across shared rooms and equipment. Locked events cannot be double-booked.</p>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-4 px-4 py-3">
          {resources.map((resource) => {
            const resourceEvents = getEventsForResource(events, resource.id);
            return (
              <div key={resource.id} className="rounded-md border bg-muted/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{resource.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {resource.location ?? resource.type} • Capacity {resource.capacity ?? "n/a"}
                    </p>
                  </div>
                  <Badge style={{ backgroundColor: resource.color, color: "#111" }}>Resource</Badge>
                </div>
                <div className="mt-3 grid gap-2">
                  {resourceEvents.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No bookings in range.</p>
                  ) : (
                    resourceEvents.map((event) => {
                      const start = parseISO(event.start);
                      const end = parseISO(event.end);
                      const duration = differenceInMinutes(end, start) / 60;
                      const locked = lockedEvents.has(event.id);
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            "flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-xs shadow-sm",
                            locked ? "border-primary" : "border-muted"
                          )}
                        >
                          <button type="button" className="flex flex-col text-left" onClick={() => onOpenEvent(event.id)}>
                            <span className="font-medium">{event.title}</span>
                            <span className="text-muted-foreground">
                              {format(start, "MMM d HH:mm")} • {duration.toFixed(1)}h
                            </span>
                          </button>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{event.status}</Badge>
                            <button
                              type="button"
                              className="rounded-md border px-2 py-1"
                              onClick={() => onToggleLock(event.id)}
                            >
                              {locked ? (
                                <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Locked</span>
                              ) : (
                                <span className="flex items-center gap-1"><Unlock className="h-3 w-3" /> Allow overlap</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
