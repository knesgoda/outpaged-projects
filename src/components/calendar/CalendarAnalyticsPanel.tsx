import { useMemo } from "react";
import { differenceInMinutes, parseISO } from "date-fns";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { CalendarEvent } from "@/types/calendar";

interface CalendarAnalyticsPanelProps {
  events: CalendarEvent[];
  onOpenReports: () => void;
}

export function CalendarAnalyticsPanel({ events, onOpenReports }: CalendarAnalyticsPanelProps) {
  const metrics = useMemo(() => {
    const countsByType = new Map<string, number>();
    let meetingMinutes = 0;
    let focusMinutes = 0;
    let conflictCount = 0;
    events.forEach((event) => {
      const key = event.type ?? "unknown";
      countsByType.set(key, (countsByType.get(key) ?? 0) + 1);
      const duration = Math.max(0, differenceInMinutes(parseISO(event.end), parseISO(event.start)));
      if (event.type === "meeting") {
        meetingMinutes += duration;
      }
      if (event.type === "focus" || event.type === "availability") {
        focusMinutes += duration;
      }
      if (event.metadata?.conflicts) {
        conflictCount += Array.isArray(event.metadata.conflicts) ? event.metadata.conflicts.length : 1;
      }
    });
    const totalEvents = events.length;
    const attendanceRate = totalEvents === 0 ? 0 : Math.min(100, Math.round((meetingMinutes / (totalEvents * 60)) * 100));
    const focusShare = totalEvents === 0 ? 0 : Math.round((focusMinutes / Math.max(meetingMinutes + focusMinutes, 1)) * 100);
    return {
      countsByType,
      meetingMinutes,
      focusMinutes,
      conflictCount,
      attendanceRate,
      focusShare,
    };
  }, [events]);

  return (
    <Card aria-label="Calendar analytics summary">
      <CardHeader className="flex flex-col gap-2">
        <CardTitle className="text-sm">Analytics</CardTitle>
        <Button size="sm" variant="outline" onClick={onOpenReports}>
          Explore in reports
        </Button>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <p className="font-semibold text-foreground">Events by type</p>
          <ul className="mt-2 space-y-1">
            {Array.from(metrics.countsByType.entries()).map(([type, count]) => (
              <li key={type} className="flex items-center justify-between">
                <span className="capitalize">{type}</span>
                <Badge variant="outline">{count}</Badge>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold text-foreground">Meeting load</p>
          <Progress value={Math.min(100, metrics.attendanceRate)} className="h-2" />
          <p className="mt-1 text-muted-foreground">
            {Math.round(metrics.meetingMinutes / 60)}h scheduled meetings, {metrics.conflictCount} conflicts
          </p>
        </div>
        <div>
          <p className="font-semibold text-foreground">Focus coverage</p>
          <Progress value={Math.min(100, metrics.focusShare)} className="h-2" />
          <p className="mt-1 text-muted-foreground">{Math.round(metrics.focusMinutes / 60)}h protected focus time</p>
        </div>
      </CardContent>
    </Card>
  );
}
