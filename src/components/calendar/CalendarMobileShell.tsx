import { format, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarMobileShellProps {
  events: CalendarEvent[];
  onOpenEvent: (eventId: string) => void;
}

export function CalendarMobileShell({ events, onOpenEvent }: CalendarMobileShellProps) {
  const upcoming = [...events]
    .filter((event) => new Date(event.end) >= new Date())
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
    .slice(0, 6);

  return (
    <Card className="lg:hidden" aria-label="Mobile calendar agenda">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Agenda</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {upcoming.length === 0 ? (
          <p className="text-muted-foreground">No upcoming events.</p>
        ) : (
          upcoming.map((event) => (
            <button
              key={event.id}
              type="button"
              className="flex w-full flex-col rounded-md border px-3 py-2 text-left"
              onClick={() => onOpenEvent(event.id)}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{event.title}</span>
                {event.status && <Badge variant="outline">{event.status}</Badge>}
              </div>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(event.start), "EEE MMM d • HH:mm")}
              </span>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
}
