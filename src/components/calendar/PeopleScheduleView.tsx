import { format, isWithinInterval, parseISO } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type {
  CalendarAvailabilityBlock,
  CalendarEvent,
  CalendarPerson,
} from "@/types/calendar";

interface PeopleScheduleViewProps {
  people: CalendarPerson[];
  events: CalendarEvent[];
  availability: CalendarAvailabilityBlock[];
  onOpenEvent: (eventId: string) => void;
  onReassignOwner: (eventId: string, ownerId: string) => void;
  conflicts: Set<string>;
  range: { from: Date; to: Date };
}

function getEventsForPerson(events: CalendarEvent[], personId: string) {
  return events.filter((event) => event.ownerId === personId || event.attendees?.some((attendee) => attendee.id === personId));
}

function getAvailabilityForPerson(blocks: CalendarAvailabilityBlock[], personId: string, range: { from: Date; to: Date }) {
  return blocks.filter((block) => {
    if (block.ownerId !== personId) return false;
    const start = parseISO(block.start);
    const end = parseISO(block.end);
    const interval = { start: range.from, end: range.to };
    return isWithinInterval(start, interval) || isWithinInterval(end, interval);
  });
}

export function PeopleScheduleView({
  people,
  events,
  availability,
  onOpenEvent,
  onReassignOwner,
  conflicts,
  range,
}: PeopleScheduleViewProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold">People view</h2>
          <p className="text-xs text-muted-foreground">Drag events between rows to reassign owners and review workload overlays.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const first = events[0];
            if (first) {
              onOpenEvent(first.id);
            }
          }}
          disabled={events.length === 0}
        >
          Open scheduling assistant
        </Button>
      </div>
      <ScrollArea className="flex-1">
        <div className="divide-y">
          {people.map((person) => {
            const personEvents = getEventsForPerson(events, person.id);
            const totalHours = personEvents.reduce((acc, event) => {
              const start = parseISO(event.start);
              const end = parseISO(event.end);
              return acc + Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60));
            }, 0);
            const availabilityBlocks = getAvailabilityForPerson(availability, person.id, range);
            return (
              <div key={person.id} className="flex flex-col gap-3 px-4 py-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {person.role} • {person.timezone}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Badge variant={totalHours > (person.workloadTargetHours ?? 32) ? "destructive" : "secondary"}>
                      Workload {totalHours.toFixed(1)}h
                    </Badge>
                    {conflicts.size > 0 && personEvents.some((event) => conflicts.has(event.id)) && (
                      <Badge variant="destructive">Conflict</Badge>
                    )}
                  </div>
                </div>
                <div className="rounded-md border bg-muted/30 p-3">
                  <div className="grid gap-2">
                    {availabilityBlocks.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        {availabilityBlocks.map((block) => (
                          <span
                            key={block.id}
                            className={cn(
                              "rounded-full px-2 py-1",
                              block.type === "busy"
                                ? "bg-destructive/10 text-destructive"
                                : block.type === "free"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-700"
                            )}
                          >
                            {block.type === "ooo" ? "Out of office" : block.type === "busy" ? "Busy" : "Free"} • {format(parseISO(block.start), "MMM d HH:mm")}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {personEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No events scheduled.</p>
                      ) : (
                        personEvents.map((event) => (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={(dragEvent) => {
                              dragEvent.dataTransfer.setData("text/plain", event.id);
                            }}
                            className={cn(
                              "flex cursor-grab items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs shadow-sm",
                              conflicts.has(event.id) && "border-destructive"
                            )}
                          >
                            <button type="button" className="truncate text-left" onClick={() => onOpenEvent(event.id)}>
                              <span className="font-medium">{event.title}</span>
                              <span className="ml-1 text-muted-foreground">
                                {format(parseISO(event.start), "MMM d HH:mm")}
                              </span>
                            </button>
                            <Badge variant="outline">{event.type}</Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div
                  className="rounded-md border border-dashed px-4 py-3 text-center text-xs text-muted-foreground"
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(dropEvent) => {
                    dropEvent.preventDefault();
                    const eventId = dropEvent.dataTransfer.getData("text/plain");
                    if (eventId) {
                      onReassignOwner(eventId, person.id);
                    }
                  }}
                >
                  Drag here to reassign events to {person.name}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
