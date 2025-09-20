import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { AlertTriangle, CalendarCheck2, ClipboardList, Shield } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  ChangeRequest,
  ChangeState,
  FreezeWindow,
  useOperations,
} from "./OperationsProvider";

const CHANGE_FLOW: ChangeState[] = ["draft", "review", "approved", "implementing", "validated", "done"];

const stateLabel: Record<ChangeState, string> = {
  draft: "Draft",
  review: "In Review",
  approved: "Approved",
  implementing: "Implementing",
  validated: "Validated",
  done: "Done",
};

export function ChangeManagementPanel() {
  const {
    changeRequests,
    services,
    createChangeRequest,
    transitionChangeState,
    freezeWindows,
    scheduleFreezeWindow,
  } = useOperations();
  const { toast } = useToast();

  const [changeDraft, setChangeDraft] = useState({
    title: "",
    description: "",
    risk: "",
    impact: "",
    backoutPlan: "",
    serviceIds: [] as string[],
    plannedStart: "",
    plannedEnd: "",
  });

  const [approverDraft, setApproverDraft] = useState<Record<string, string>>({});
  const [freezeDraft, setFreezeDraft] = useState({
    name: "",
    start: "",
    end: "",
    teams: [] as string[],
  });

  const ownerTeams = useMemo(() => Array.from(new Set(services.map((service) => service.ownerTeam))), [services]);

  const handleCreateChange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!changeDraft.title || !changeDraft.risk || !changeDraft.impact || !changeDraft.backoutPlan) {
      toast({
        title: "Missing required fields",
        description: "Risk, impact, and backout plan are mandatory before review.",
        variant: "destructive",
      });
      return;
    }
    createChangeRequest({
      title: changeDraft.title,
      description: changeDraft.description,
      risk: changeDraft.risk,
      impact: changeDraft.impact,
      backoutPlan: changeDraft.backoutPlan,
      requestedBy: "Change Manager",
      serviceIds: changeDraft.serviceIds,
      plannedStart: changeDraft.plannedStart || undefined,
      plannedEnd: changeDraft.plannedEnd || undefined,
    });
    setChangeDraft({ title: "", description: "", risk: "", impact: "", backoutPlan: "", serviceIds: [], plannedStart: "", plannedEnd: "" });
  };

  const handleTransition = (change: ChangeRequest, nextState: ChangeState, overrideFreeze = false) => {
    try {
      transitionChangeState(change.id, nextState, "Change Manager", {
        approverName: nextState === "approved" ? approverDraft[change.id] : undefined,
        overrideFreeze,
      });
      toast({ title: `Change moved to ${stateLabel[nextState]}` });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to update change";
      toast({ title: "Transition blocked", description: message, variant: "destructive" });
    }
  };

  const handleScheduleFreeze = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!freezeDraft.name || !freezeDraft.start || !freezeDraft.end || freezeDraft.teams.length === 0) {
      toast({
        title: "Freeze window incomplete",
        description: "Provide a name, date range, and the teams affected.",
        variant: "destructive",
      });
      return;
    }
    scheduleFreezeWindow({
      name: freezeDraft.name,
      start: freezeDraft.start,
      end: freezeDraft.end,
      teams: freezeDraft.teams,
      allowOverride: false,
    });
    setFreezeDraft({ name: "", start: "", end: "", teams: [] });
  };

  const calendarEntries = useMemo(() => {
    return [...changeRequests]
      .filter((change) => change.plannedStart)
      .sort((a, b) => parseISO(a.plannedStart ?? new Date().toISOString()).getTime() - parseISO(b.plannedStart ?? new Date().toISOString()).getTime());
  }, [changeRequests]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Change enablement</CardTitle>
        <CardDescription>
          Govern deployments with stage gates, approvals, and freeze windows enforced across the change calendar.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateChange} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="change-title">Change title</Label>
            <Input
              id="change-title"
              value={changeDraft.title}
              onChange={(event) => setChangeDraft((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Deploy payments service 4.2"
            />
          </div>
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="change-description">Description</Label>
            <Textarea
              id="change-description"
              value={changeDraft.description}
              onChange={(event) => setChangeDraft((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Summary of the change, validation steps, and rollout plan"
              rows={3}
            />
          </div>
          <div className="lg:col-span-4 grid gap-3">
            <div className="space-y-1">
              <Label>Risk assessment</Label>
              <Textarea
                value={changeDraft.risk}
                onChange={(event) => setChangeDraft((prev) => ({ ...prev, risk: event.target.value }))}
                placeholder="Call out blast radius, customer impact, rollback complexity"
              />
            </div>
            <div className="space-y-1">
              <Label>Impact summary</Label>
              <Textarea
                value={changeDraft.impact}
                onChange={(event) => setChangeDraft((prev) => ({ ...prev, impact: event.target.value }))}
                placeholder="Affected services, users, revenue exposure"
              />
            </div>
            <div className="space-y-1">
              <Label>Backout plan</Label>
              <Textarea
                value={changeDraft.backoutPlan}
                onChange={(event) => setChangeDraft((prev) => ({ ...prev, backoutPlan: event.target.value }))}
                placeholder="Document fallback, rollback commands, communications"
              />
            </div>
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Planned start</Label>
            <Input
              type="datetime-local"
              value={changeDraft.plannedStart}
              onChange={(event) => setChangeDraft((prev) => ({ ...prev, plannedStart: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Planned end</Label>
            <Input
              type="datetime-local"
              value={changeDraft.plannedEnd}
              onChange={(event) => setChangeDraft((prev) => ({ ...prev, plannedEnd: event.target.value }))}
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Impacted services</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-auto">
              {services.map((service) => {
                const checked = changeDraft.serviceIds.includes(service.id);
                return (
                  <label key={service.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setChangeDraft((prev) => ({
                          ...prev,
                          serviceIds: isChecked
                            ? [...prev.serviceIds, service.id]
                            : prev.serviceIds.filter((id) => id !== service.id),
                        }));
                      }}
                    />
                    <span>{service.name}</span>
                    <Badge variant="outline" className="ml-auto text-xs">
                      {service.ownerTeam}
                    </Badge>
                  </label>
                );
              })}
            </div>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">
              Submit change for review
            </Button>
          </div>
        </form>

        <div className="grid gap-4 lg:grid-cols-2">
          {changeRequests.map((change) => {
            const currentIndex = CHANGE_FLOW.indexOf(change.state);
            const nextState = CHANGE_FLOW[currentIndex + 1];
            return (
              <Card key={change.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> {change.title}
                  </CardTitle>
                  <CardDescription>
                    Requested by {change.requestedBy} • {change.serviceIds.length} service(s)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {CHANGE_FLOW.map((state, index) => (
                      <Badge
                        key={state}
                        variant={index <= currentIndex ? "default" : "outline"}
                      >
                        {stateLabel[state]}
                      </Badge>
                    ))}
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Risk</div>
                    <p>{change.risk}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Impact</div>
                    <p>{change.impact}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-muted-foreground">Backout</div>
                    <p>{change.backoutPlan}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {change.serviceIds.map((serviceId) => {
                      const service = services.find((item) => item.id === serviceId);
                      return service ? (
                        <Badge key={serviceId} variant="outline">
                          {service.name}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                  {nextState && (
                    <div className="space-y-2">
                      {nextState === "approved" && (
                        <div className="space-y-1">
                          <Label htmlFor={`approver-${change.id}`}>Approver</Label>
                          <Input
                            id={`approver-${change.id}`}
                            value={approverDraft[change.id] ?? ""}
                            onChange={(event) =>
                              setApproverDraft((prev) => ({ ...prev, [change.id]: event.target.value }))
                            }
                            placeholder="Approver name"
                          />
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={nextState === "done" ? "default" : "outline"}
                          onClick={() => handleTransition(change, nextState)}
                          disabled={nextState === "approved" && !approverDraft[change.id]}
                        >
                          Advance to {stateLabel[nextState]}
                        </Button>
                        {nextState === "implementing" && (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleTransition(change, nextState, true)}
                          >
                            Override freeze
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                  {change.plannedStart && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <CalendarCheck2 className="h-3 w-3" /> Scheduled {format(parseISO(change.plannedStart), "MMM d HH:mm")}
                    </div>
                  )}
                  {change.freezeOverride && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3 w-3" /> Override documented
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-semibold flex items-center gap-2 text-sm">
            <CalendarCheck2 className="h-4 w-4" /> Change calendar
          </h4>
          <div className="space-y-2 text-sm">
            {calendarEntries.length === 0 && <p className="text-muted-foreground">No scheduled changes yet.</p>}
            {calendarEntries.map((change) => (
              <div key={change.id} className="flex flex-wrap items-center justify-between gap-2 border rounded-md p-3">
                <div>
                  <div className="font-medium">{change.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(parseISO(change.plannedStart ?? new Date().toISOString()), "MMM d HH:mm")} →
                    {change.plannedEnd ? ` ${format(parseISO(change.plannedEnd), "MMM d HH:mm")}` : " TBD"}
                  </div>
                </div>
                <Badge variant="outline">{stateLabel[change.state]}</Badge>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-3">
            <h5 className="font-semibold flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4" /> Freeze windows
            </h5>
            <form onSubmit={handleScheduleFreeze} className="grid gap-3 lg:grid-cols-12">
              <div className="lg:col-span-3 space-y-1">
                <Label htmlFor="freeze-name">Name</Label>
                <Input
                  id="freeze-name"
                  value={freezeDraft.name}
                  onChange={(event) => setFreezeDraft((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Holiday freeze"
                />
              </div>
              <div className="lg:col-span-3 space-y-1">
                <Label htmlFor="freeze-start">Start</Label>
                <Input
                  id="freeze-start"
                  type="datetime-local"
                  value={freezeDraft.start}
                  onChange={(event) => setFreezeDraft((prev) => ({ ...prev, start: event.target.value }))}
                />
              </div>
              <div className="lg:col-span-3 space-y-1">
                <Label htmlFor="freeze-end">End</Label>
                <Input
                  id="freeze-end"
                  type="datetime-local"
                  value={freezeDraft.end}
                  onChange={(event) => setFreezeDraft((prev) => ({ ...prev, end: event.target.value }))}
                />
              </div>
              <div className="lg:col-span-3 space-y-1">
                <Label>Affected teams</Label>
                <div className="border rounded-md p-2 space-y-1 max-h-32 overflow-auto">
                  {ownerTeams.map((team) => {
                    const checked = freezeDraft.teams.includes(team);
                    return (
                      <label key={team} className="flex items-center gap-2 text-xs">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(checked) =>
                            setFreezeDraft((prev) => ({
                              ...prev,
                              teams: checked === true
                                ? [...prev.teams, team]
                                : prev.teams.filter((item) => item !== team),
                            }))
                          }
                        />
                        <span>{team}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="lg:col-span-12 flex justify-end">
                <Button type="submit">Schedule freeze</Button>
              </div>
            </form>

            <div className="space-y-2 text-sm">
              {freezeWindows.length === 0 && (
                <p className="text-muted-foreground">No freeze windows configured. Approvals will block changes when a window overlaps.</p>
              )}
              {freezeWindows.map((window: FreezeWindow) => (
                <div key={window.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
                  <div>
                    <div className="font-medium">{window.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(window.start), "MMM d HH:mm")} → {format(parseISO(window.end), "MMM d HH:mm")} • {window.teams.join(", ")}
                    </div>
                  </div>
                  <Badge variant="destructive">Blocking</Badge>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
