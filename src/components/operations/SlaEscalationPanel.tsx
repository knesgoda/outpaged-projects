import { useState } from "react";
import { AlertTriangle, CalendarClock, PauseCircle, PlayCircle } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useOperations, IncidentState } from "./OperationsProvider";

const PAUSEABLE_STATES: IncidentState[] = ["open", "mitigated", "monitoring", "resolved"];

export function SlaEscalationPanel() {
  const { businessCalendars, saveBusinessCalendar, incidents } = useOperations();
  const [calendarDraft, setCalendarDraft] = useState({
    name: "",
    timezone: "UTC",
    startHour: 9,
    endHour: 17,
    pauseStates: ["monitoring" as IncidentState],
    nearBreachContacts: "",
    breachContacts: "",
  });

  const handleCreateCalendar = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!calendarDraft.name) return;
    const hours = [1, 2, 3, 4, 5].map((day) => ({ day, start: `${calendarDraft.startHour}:00`, end: `${calendarDraft.endHour}:00` }));
    saveBusinessCalendar({
      id: undefined,
      name: calendarDraft.name,
      timezone: calendarDraft.timezone,
      hours,
      pauseStates: calendarDraft.pauseStates,
      escalationContacts: {
        nearBreach: calendarDraft.nearBreachContacts.split(",").map((s) => s.trim()).filter(Boolean),
        breach: calendarDraft.breachContacts.split(",").map((s) => s.trim()).filter(Boolean),
      },
    });
    setCalendarDraft({ name: "", timezone: "UTC", startHour: 9, endHour: 17, pauseStates: ["monitoring"], nearBreachContacts: "", breachContacts: "" });
  };

  const escalatedIncidents = incidents.filter((incident) => incident.nearBreachEscalated || incident.breachEscalated);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business hour calendars & escalations</CardTitle>
        <CardDescription>
          Pause SLA timers during approved states and surface near-breach notifications to on-call responders and leads.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateCalendar} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="calendar-name">Calendar name</Label>
            <Input
              id="calendar-name"
              value={calendarDraft.name}
              onChange={(event) => setCalendarDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Americas business hours"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="calendar-timezone">Timezone</Label>
            <Input
              id="calendar-timezone"
              value={calendarDraft.timezone}
              onChange={(event) => setCalendarDraft((prev) => ({ ...prev, timezone: event.target.value }))}
              placeholder="UTC"
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>Start hour</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={calendarDraft.startHour}
              onChange={(event) => setCalendarDraft((prev) => ({ ...prev, startHour: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label>End hour</Label>
            <Input
              type="number"
              min={0}
              max={23}
              value={calendarDraft.endHour}
              onChange={(event) => setCalendarDraft((prev) => ({ ...prev, endHour: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-6 space-y-2">
            <Label>Pause SLA when incident is in:</Label>
            <div className="flex flex-wrap gap-3 text-sm">
              {PAUSEABLE_STATES.map((state) => {
                const checked = calendarDraft.pauseStates.includes(state);
                return (
                  <label key={state} className="flex items-center gap-2">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) =>
                        setCalendarDraft((prev) => ({
                          ...prev,
                          pauseStates: value === true
                            ? Array.from(new Set([...prev.pauseStates, state]))
                            : prev.pauseStates.filter((item) => item !== state),
                        }))
                      }
                    />
                    <span className="capitalize">{state}</span>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Near-breach contacts</Label>
            <Input
              value={calendarDraft.nearBreachContacts}
              onChange={(event) => setCalendarDraft((prev) => ({ ...prev, nearBreachContacts: event.target.value }))}
              placeholder="oncall@example.com, lead@example.com"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Breach escalation</Label>
            <Input
              value={calendarDraft.breachContacts}
              onChange={(event) => setCalendarDraft((prev) => ({ ...prev, breachContacts: event.target.value }))}
              placeholder="director@example.com"
            />
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">Save calendar</Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          {businessCalendars.map((calendar) => (
            <Card key={calendar.id} className="border-dashed">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" /> {calendar.name}
                </CardTitle>
                <CardDescription>
                  {calendar.timezone} • Pauses {calendar.pauseStates.join(", ")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                <div>Working hours:</div>
                <div className="flex flex-wrap gap-2">
                  {calendar.hours.map((hour) => (
                    <Badge key={`${calendar.id}-${hour.day}-${hour.start}`} variant="outline">
                      Day {hour.day}: {hour.start} - {hour.end}
                    </Badge>
                  ))}
                </div>
                <div className="text-muted-foreground">
                  Near breach → {calendar.escalationContacts.nearBreach.join(", ") || "None"}
                </div>
                <div className="text-muted-foreground">
                  Breach → {calendar.escalationContacts.breach.join(", ") || "None"}
                </div>
              </CardContent>
            </Card>
          ))}
          {businessCalendars.length === 0 && (
            <div className="col-span-2 text-sm text-muted-foreground border rounded-lg p-6">
              Define calendars to align SLA expectations to local business hours.
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <AlertTriangle className="h-4 w-4" /> Active escalations
          </h4>
          <div className="space-y-2 text-sm">
            {escalatedIncidents.length === 0 && <p className="text-muted-foreground">All incidents are within SLA.</p>}
            {escalatedIncidents.map((incident) => (
              <div key={incident.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <div className="font-medium">{incident.title}</div>
                  <div className="text-xs text-muted-foreground">
                    Severity {incident.severity} • SLA due {new Date(incident.slaDueAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {incident.nearBreachEscalated && !incident.breachEscalated && (
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <PauseCircle className="h-3 w-3" /> Near breach
                    </Badge>
                  )}
                  {incident.breachEscalated && (
                    <Badge variant="destructive" className="flex items-center gap-1">
                      <PlayCircle className="h-3 w-3" /> Breached
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
