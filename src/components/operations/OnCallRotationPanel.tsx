import { useMemo, useState } from "react";
import { format } from "date-fns";
import { AlertOctagon, BellRing, Clock, UserCheck } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { useOperations } from "./OperationsProvider";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface ShiftDraft {
  dayOfWeek: number;
  startHour: number;
  endHour: number;
  engineer: string;
}

export function OnCallRotationPanel() {
  const { onCallRotations, pagingAudit, createOnCallRotation, acknowledgePage } = useOperations();
  const [rotationDraft, setRotationDraft] = useState({ name: "", team: "", timezone: "UTC" });
  const [shiftDraft, setShiftDraft] = useState<ShiftDraft>({ dayOfWeek: 1, startHour: 9, endHour: 17, engineer: "" });
  const [shifts, setShifts] = useState<ShiftDraft[]>([]);

  const handleAddShift = () => {
    if (!shiftDraft.engineer) return;
    setShifts((prev) => [...prev, shiftDraft]);
    setShiftDraft({ dayOfWeek: 1, startHour: 9, endHour: 17, engineer: "" });
  };

  const handleCreateRotation = () => {
    if (!rotationDraft.name || !rotationDraft.team || shifts.length === 0) return;
    createOnCallRotation({
      ...rotationDraft,
      shifts: shifts.map((shift) => ({
        id: `${shift.dayOfWeek}-${shift.startHour}-${shift.engineer}`,
        ...shift,
      })),
      escalationContacts: [],
    });
    setRotationDraft({ name: "", team: "", timezone: "UTC" });
    setShifts([]);
  };

  const activeShiftInfo = useMemo(() => {
    const now = new Date();
    const day = now.getDay();
    const hour = now.getHours();
    return onCallRotations.map((rotation) => {
      const activeShift = rotation.shifts.find((shift) => {
        if (shift.dayOfWeek !== day) return false;
        if (shift.startHour <= shift.endHour) {
          return hour >= shift.startHour && hour < shift.endHour;
        }
        return hour >= shift.startHour || hour < shift.endHour;
      });
      return { rotationId: rotation.id, engineer: activeShift?.engineer };
    });
  }, [onCallRotations]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>On-call rotations & paging</CardTitle>
        <CardDescription>
          Define follow-the-sun schedules so Sev1 incidents automatically mobilize the correct responder with audit trails.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="rotation-name">Rotation name</Label>
            <Input
              id="rotation-name"
              value={rotationDraft.name}
              onChange={(event) => setRotationDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Operations Primary"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="rotation-team">Team</Label>
            <Input
              id="rotation-team"
              value={rotationDraft.team}
              onChange={(event) => setRotationDraft((prev) => ({ ...prev, team: event.target.value }))}
              placeholder="Platform"
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label htmlFor="rotation-timezone">Timezone</Label>
            <Input
              id="rotation-timezone"
              value={rotationDraft.timezone}
              onChange={(event) => setRotationDraft((prev) => ({ ...prev, timezone: event.target.value }))}
              placeholder="UTC"
            />
          </div>
          <div className="lg:col-span-12 border rounded-md p-3 space-y-3">
            <h4 className="text-sm font-semibold">Define shift coverage</h4>
            <div className="grid gap-3 lg:grid-cols-12 items-end">
              <div className="lg:col-span-3 space-y-1">
                <Label>Day</Label>
                <select
                  className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                  value={shiftDraft.dayOfWeek}
                  onChange={(event) =>
                    setShiftDraft((prev) => ({ ...prev, dayOfWeek: Number(event.target.value) }))
                  }
                >
                  {DAYS.map((day, index) => (
                    <option key={day} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>
              <div className="lg:col-span-2 space-y-1">
                <Label>Start hour</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={shiftDraft.startHour}
                  onChange={(event) => setShiftDraft((prev) => ({ ...prev, startHour: Number(event.target.value) }))}
                />
              </div>
              <div className="lg:col-span-2 space-y-1">
                <Label>End hour</Label>
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={shiftDraft.endHour}
                  onChange={(event) => setShiftDraft((prev) => ({ ...prev, endHour: Number(event.target.value) }))}
                />
              </div>
              <div className="lg:col-span-3 space-y-1">
                <Label>Engineer</Label>
                <Input
                  value={shiftDraft.engineer}
                  onChange={(event) => setShiftDraft((prev) => ({ ...prev, engineer: event.target.value }))}
                  placeholder="oncall@example.com"
                />
              </div>
              <div className="lg:col-span-2">
                <Button type="button" onClick={handleAddShift} className="w-full">
                  Add shift
                </Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {shifts.length === 0 && <span className="text-muted-foreground">No shifts configured yet.</span>}
              {shifts.map((shift, index) => (
                <Badge key={`${shift.dayOfWeek}-${index}`} variant="outline">
                  {DAYS[shift.dayOfWeek]} • {shift.startHour}:00 → {shift.endHour}:00 • {shift.engineer}
                </Badge>
              ))}
            </div>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="button" onClick={handleCreateRotation} disabled={shifts.length === 0}>
              Save rotation
            </Button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {onCallRotations.map((rotation) => {
            const active = activeShiftInfo.find((info) => info.rotationId === rotation.id);
            return (
              <Card key={rotation.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BellRing className="h-4 w-4 text-primary" /> {rotation.name}
                  </CardTitle>
                  <CardDescription>
                    Team {rotation.team} • {rotation.timezone}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" /> Active engineer: {active?.engineer ?? "No coverage"}
                  </div>
                  <div className="space-y-1">
                    {rotation.shifts.map((shift) => (
                      <div key={shift.id} className="flex items-center justify-between">
                        <span>
                          {DAYS[shift.dayOfWeek]} • {shift.startHour}:00 → {shift.endHour}:00
                        </span>
                        <Badge variant="secondary">{shift.engineer}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {onCallRotations.length === 0 && (
            <div className="col-span-2 text-sm text-muted-foreground border rounded-lg p-6">
              Define a rotation to automatically notify the right engineer when Sev1 incidents trigger.
            </div>
          )}
        </div>

        <div className="border rounded-lg p-4 space-y-3">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <AlertOctagon className="h-4 w-4" /> Paging audit log
          </h4>
          <div className="space-y-2 text-sm">
            {pagingAudit.length === 0 && <p className="text-muted-foreground">No pages triggered yet.</p>}
            {pagingAudit.map((entry) => (
              <div
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3"
              >
                <div>
                  <div className="font-medium">{entry.engineer}</div>
                  <div className="text-xs text-muted-foreground">
                    Paged at {format(new Date(entry.triggeredAt), "MMM d HH:mm" )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {entry.acknowledgedAt ? (
                    <Badge variant="outline" className="flex items-center gap-1">
                      <UserCheck className="h-3 w-3" /> Acknowledged {format(new Date(entry.acknowledgedAt), "MMM d HH:mm")}
                    </Badge>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => acknowledgePage(entry.id)}>
                      Mark acknowledged
                    </Button>
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
