import { addDays, differenceInHours, endOfDay, format, parseISO, startOfDay } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CalendarAvailabilityBlock, CalendarEvent } from "@/types/calendar";

interface AvailabilityHeatmapProps {
  events: CalendarEvent[];
  availability: CalendarAvailabilityBlock[];
  range: { from: Date; to: Date };
}

function buildHeatmap(events: CalendarEvent[], availability: CalendarAvailabilityBlock[], range: { from: Date; to: Date }) {
  const days: Array<{ date: Date; busyHours: number; freeHours: number; oooHours: number }> = [];
  for (let cursor = startOfDay(range.from); cursor <= range.to; cursor = addDays(cursor, 1)) {
    const dayStart = startOfDay(cursor);
    const dayEnd = endOfDay(cursor);
    const dayEvents = events.filter((event) => {
      const start = parseISO(event.start);
      return start >= dayStart && start <= dayEnd;
    });
    const busyHours = dayEvents.reduce((acc, event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return acc + Math.max(0, differenceInHours(end, start));
    }, 0);

    const dayBlocks = availability.filter((block) => {
      const start = parseISO(block.start);
      const end = parseISO(block.end);
      return (start >= dayStart && start <= dayEnd) || (end >= dayStart && end <= dayEnd);
    });
    const freeHours = dayBlocks
      .filter((block) => block.type === "free")
      .reduce((acc, block) => acc + Math.max(0, differenceInHours(parseISO(block.end), parseISO(block.start))), 0);
    const oooHours = dayBlocks
      .filter((block) => block.type === "ooo")
      .reduce((acc, block) => acc + Math.max(0, differenceInHours(parseISO(block.end), parseISO(block.start))), 0);

    days.push({ date: dayStart, busyHours, freeHours, oooHours });
  }
  return days;
}

export function AvailabilityHeatmap({ events, availability, range }: AvailabilityHeatmapProps) {
  const summary = buildHeatmap(events, availability, range);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Workload & availability</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {summary.length === 0 ? (
          <p className="text-xs text-muted-foreground">No events in range.</p>
        ) : (
          <div className="grid gap-2">
            {summary.map((day) => (
              <div key={day.date.toISOString()} className="flex items-center justify-between rounded-md border px-3 py-2 text-xs">
                <div>
                  <p className="font-medium">{format(day.date, "EEE MMM d")}</p>
                  <p className="text-muted-foreground">Busy {day.busyHours.toFixed(1)}h • Free {day.freeHours.toFixed(1)}h</p>
                </div>
                {day.oooHours > 0 && <span className="rounded-full bg-destructive/10 px-2 py-1 text-destructive">OOO {day.oooHours.toFixed(1)}h</span>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
