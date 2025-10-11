import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  CalendarHoliday,
  CalendarOutOfOffice,
  CalendarWorkingHours,
  SchedulingAssistantSuggestion,
} from "@/types/calendar";

interface SchedulingAssistantPanelProps {
  suggestions: SchedulingAssistantSuggestion[];
  workingHours: CalendarWorkingHours[];
  holidays: CalendarHoliday[];
  outOfOffice: CalendarOutOfOffice[];
  onAcceptSuggestion: (suggestionId: string) => void;
  onRefresh: () => void;
}

function formatRange(startIso: string, endIso: string) {
  const start = parseISO(startIso);
  const end = parseISO(endIso);
  return `${format(start, "MMM d, HH:mm")} – ${format(end, "HH:mm")}`;
}

export function SchedulingAssistantPanel({
  suggestions,
  workingHours,
  holidays,
  outOfOffice,
  onAcceptSuggestion,
  onRefresh,
}: SchedulingAssistantPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Scheduling assistant</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Suggestions</h3>
            <Button size="sm" variant="ghost" onClick={onRefresh}>
              Refresh
            </Button>
          </div>
          {suggestions.length === 0 ? (
            <p className="text-muted-foreground">No suggestions available—try refreshing.</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="rounded-md border bg-muted/20 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{formatRange(suggestion.start, suggestion.end)}</p>
                      <p className="text-muted-foreground">
                        Score {(suggestion.score * 100).toFixed(0)}%
                        {suggestion.reason ? ` • ${suggestion.reason}` : ""}
                      </p>
                    </div>
                    <Badge variant={suggestion.type === "primary" ? "default" : "secondary"}>{suggestion.type}</Badge>
                  </div>
                  {suggestion.conflicts && suggestion.conflicts.length > 0 && (
                    <p className="mt-2 text-[11px] text-destructive">
                      Conflicts with {suggestion.conflicts.length} event(s).
                    </p>
                  )}
                  <Button
                    size="sm"
                    className="mt-3"
                    onClick={() => onAcceptSuggestion(suggestion.id)}
                  >
                    Hold slot
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Working hours & holidays</h3>
          <div className="space-y-2">
            {workingHours.map((entry) => (
              <div key={entry.ownerId} className="rounded-md border bg-muted/10 p-3">
                <p className="text-sm font-medium">{entry.ownerId}</p>
                <p className="text-muted-foreground">Timezone: {entry.timezone}</p>
              </div>
            ))}
          </div>
          {holidays.length > 0 && (
            <div className="space-y-1 text-muted-foreground">
              {holidays.map((holiday) => (
                <p key={holiday.id}>
                  {holiday.name} • {holiday.date} ({holiday.region})
                </p>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="text-[11px] font-semibold uppercase text-muted-foreground">Out of office</h3>
          {outOfOffice.length === 0 ? (
            <p className="text-muted-foreground">No upcoming out-of-office events.</p>
          ) : (
            <ul className="space-y-1 text-muted-foreground">
              {outOfOffice.map((entry) => (
                <li key={entry.id}>
                  {entry.ownerId} • {entry.status} • {entry.start.slice(0, 10)} → {entry.end.slice(0, 10)}
                </li>
              ))}
            </ul>
          )}
        </section>
      </CardContent>
      <CardFooter className="text-[11px] text-muted-foreground">
        Suggestions respect current working hours and holiday calendars.
      </CardFooter>
    </Card>
  );
}
