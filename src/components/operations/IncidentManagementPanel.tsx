import { useMemo, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { AlertTriangle, CheckCircle2, Clock, Link as LinkIcon, Plus, Users } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  SLA_BY_SEVERITY,
  Incident,
  IncidentState,
  IncidentSeverity,
  useOperations,
} from "./OperationsProvider";

const INCIDENT_FLOW: IncidentState[] = ["open", "mitigated", "monitoring", "resolved"];

const severityVariant: Record<IncidentSeverity, "default" | "destructive" | "secondary" | "outline"> = {
  Sev1: "destructive",
  Sev2: "default",
  Sev3: "secondary",
  Sev4: "outline",
};

const stateLabels: Record<IncidentState, string> = {
  open: "Open",
  mitigated: "Mitigated",
  monitoring: "Monitoring",
  resolved: "Resolved",
};

export function IncidentManagementPanel() {
  const {
    incidents,
    services,
    businessCalendars,
    createIncident,
    transitionIncident,
    addIncidentResponder,
    addWorkspaceTask,
    updateWorkspaceTaskStatus,
    addWorkspaceLink,
    recordPostmortem,
    addIncidentTimelineEntry,
    toggleServiceChecklist,
  } = useOperations();

  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "Sev2" as IncidentSeverity,
    affectedServices: [] as string[],
    businessCalendarId: "",
  });
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [postmortemIncidentId, setPostmortemIncidentId] = useState<string | null>(null);
  const [postmortemDraft, setPostmortemDraft] = useState({
    impact: "",
    rootCause: "",
    correctiveActions: "",
    actionItems: "",
    createdBy: "",
  });
  const [responderDraft, setResponderDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState({ title: "", owner: "" });
  const [linkDraft, setLinkDraft] = useState({ label: "", url: "" });

  const selectedIncident = useMemo(
    () => incidents.find((incident) => incident.id === selectedIncidentId) ?? incidents[0] ?? null,
    [incidents, selectedIncidentId]
  );

  const handleIncidentSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newIncident.title || !newIncident.description) return;
    const incident = createIncident({
      title: newIncident.title,
      description: newIncident.description,
      severity: newIncident.severity,
      affectedServices: newIncident.affectedServices,
      businessCalendarId: newIncident.businessCalendarId || undefined,
    });
    setSelectedIncidentId(incident.id);
    setNewIncident({ title: "", description: "", severity: "Sev2", affectedServices: [], businessCalendarId: "" });
  };

  const handleResponderAdd = () => {
    if (!selectedIncident || !responderDraft) return;
    addIncidentResponder(selectedIncident.id, responderDraft);
    addIncidentTimelineEntry(selectedIncident.id, {
      actor: responderDraft,
      action: "Joined incident as responder",
    });
    setResponderDraft("");
  };

  const handleTaskAdd = () => {
    if (!selectedIncident || !taskDraft.title || !taskDraft.owner) return;
    addWorkspaceTask(selectedIncident.id, taskDraft);
    addIncidentTimelineEntry(selectedIncident.id, {
      actor: taskDraft.owner,
      action: `Created task: ${taskDraft.title}`,
    });
    setTaskDraft({ title: "", owner: "" });
  };

  const handleLinkAdd = () => {
    if (!selectedIncident || !linkDraft.label || !linkDraft.url) return;
    addWorkspaceLink(selectedIncident.id, linkDraft);
    addIncidentTimelineEntry(selectedIncident.id, {
      actor: "system",
      action: `Added workspace link: ${linkDraft.label}`,
    });
    setLinkDraft({ label: "", url: "" });
  };

  const handlePostmortemSubmit = () => {
    if (!postmortemIncidentId) return;
    const actionItems = postmortemDraft.actionItems
      .split("\n")
      .map((item) => item.trim())
      .filter(Boolean)
      .map((description) => ({ description, owner: postmortemDraft.createdBy }));
    recordPostmortem(postmortemIncidentId, {
      incidentId: postmortemIncidentId,
      impact: postmortemDraft.impact,
      rootCause: postmortemDraft.rootCause,
      correctiveActions: postmortemDraft.correctiveActions,
      createdBy: postmortemDraft.createdBy,
      actionItems,
    });
    setPostmortemDraft({ impact: "", rootCause: "", correctiveActions: "", actionItems: "", createdBy: "" });
    setPostmortemIncidentId(null);
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Incident Command Center</CardTitle>
        <CardDescription>
          Track incidents end-to-end with severity-driven SLAs, on-call mobilization, and dedicated workspaces.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleIncidentSubmit} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label htmlFor="incident-title">Incident title</Label>
            <Input
              id="incident-title"
              value={newIncident.title}
              onChange={(event) => setNewIncident((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="Core API outage"
            />
          </div>
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="incident-description">Description</Label>
            <Textarea
              id="incident-description"
              value={newIncident.description}
              onChange={(event) => setNewIncident((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="Describe customer impact, scope, and initial signals"
              rows={3}
            />
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label htmlFor="incident-severity">Severity</Label>
            <select
              id="incident-severity"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={newIncident.severity}
              onChange={(event) =>
                setNewIncident((prev) => ({ ...prev, severity: event.target.value as IncidentSeverity }))
              }
            >
              {Object.keys(SLA_BY_SEVERITY).map((severity) => (
                <option key={severity} value={severity}>
                  {severity} • Default SLA {SLA_BY_SEVERITY[severity as IncidentSeverity]}h
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-2 space-y-2">
            <Label htmlFor="incident-calendar">Business calendar</Label>
            <select
              id="incident-calendar"
              className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
              value={newIncident.businessCalendarId}
              onChange={(event) => setNewIncident((prev) => ({ ...prev, businessCalendarId: event.target.value }))}
            >
              <option value="">Default 24x7</option>
              {businessCalendars.map((calendar) => (
                <option key={calendar.id} value={calendar.id}>
                  {calendar.name} ({calendar.timezone})
                </option>
              ))}
            </select>
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Affected services</Label>
            <div className="border rounded-md p-3 space-y-2 max-h-40 overflow-auto">
              {services.length === 0 && (
                <p className="text-xs text-muted-foreground">Define services in the Service Registry to link ownership.</p>
              )}
              {services.map((service) => {
                const checked = newIncident.affectedServices.includes(service.id);
                return (
                  <label key={service.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(checked) => {
                        const isChecked = checked === true;
                        setNewIncident((prev) => ({
                          ...prev,
                          affectedServices: isChecked
                            ? [...prev.affectedServices, service.id]
                            : prev.affectedServices.filter((id) => id !== service.id),
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
          <div className="lg:col-span-12 flex items-end justify-between">
            <div className="text-sm text-muted-foreground">
              SLA is automatically set based on severity. Sev1 incidents notify active on-call engineers immediately.
            </div>
            <Button type="submit" className="ml-auto">
              <Plus className="mr-2 h-4 w-4" />
              Create incident
            </Button>
          </div>
        </form>

        <Tabs defaultValue={selectedIncident?.id ?? incidents[0]?.id} value={selectedIncident?.id} onValueChange={setSelectedIncidentId}>
          <TabsList className="flex-wrap">
            {incidents.map((incident) => (
              <TabsTrigger key={incident.id} value={incident.id} className="text-left">
                <div className="flex items-center gap-2">
                  <Badge variant={severityVariant[incident.severity]}>{incident.severity}</Badge>
                  <span className="font-medium">{incident.title}</span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>

          {incidents.map((incident) => (
            <TabsContent key={incident.id} value={incident.id} className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-12">
                <div className="lg:col-span-8 space-y-4">
                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-semibold">{incident.title}</h3>
                        <p className="text-sm text-muted-foreground">{incident.description}</p>
                      </div>
                      <div className="text-sm text-muted-foreground text-right">
                        <div>Opened {formatDistanceToNow(new Date(incident.createdAt), { addSuffix: true })}</div>
                        <div>
                          SLA breach {formatDistanceToNow(new Date(incident.slaDueAt), { addSuffix: true })}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incident.affectedServices.map((serviceId) => {
                        const service = services.find((item) => item.id === serviceId);
                        if (!service) return null;
                        return (
                          <Badge key={serviceId} variant="outline">
                            {service.name} • {service.ownerTeam}
                          </Badge>
                        );
                      })}
                    </div>
                    <div className="flex flex-wrap gap-3 items-center">
                      {INCIDENT_FLOW.map((state, index) => {
                        const stateIndex = INCIDENT_FLOW.indexOf(incident.state);
                        const isCurrent = incident.state === state;
                        const isCompleted = stateIndex > INCIDENT_FLOW.indexOf(state);
                        const canAdvance = incident.state !== "resolved" && index === stateIndex + 1;
                        return (
                          <div key={state} className="flex items-center gap-2">
                            <Button
                              variant={isCurrent ? "default" : isCompleted ? "secondary" : "outline"}
                              size="sm"
                              disabled={!isCurrent && !canAdvance}
                              onClick={() => transitionIncident(incident.id, state, "Operations")}
                            >
                              {stateLabels[state]}
                            </Button>
                            {index < INCIDENT_FLOW.length - 1 && <Separator orientation="vertical" className="h-6" />}
                          </div>
                        );
                      })}
                      {incident.state === "resolved" && !incident.postmortem && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPostmortemIncidentId(incident.id);
                            setPostmortemDraft({ impact: "", rootCause: "", correctiveActions: "", actionItems: "", createdBy: "" });
                          }}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" /> Complete postmortem
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        <Users className="h-4 w-4" /> Responders
                      </h4>
                      <div className="flex gap-2">
                        <Input
                          value={responderDraft}
                          onChange={(event) => setResponderDraft(event.target.value)}
                          placeholder="Add engineer"
                          className="h-9"
                        />
                        <Button type="button" onClick={handleResponderAdd}>
                          Add
                        </Button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {incident.workspace.responders.map((responder) => (
                        <Badge key={responder} variant="secondary">
                          {responder}
                        </Badge>
                      ))}
                      {incident.workspace.responders.length === 0 && (
                        <p className="text-sm text-muted-foreground">No responders added yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4" /> Task checklist
                        </h4>
                        <div className="flex gap-2">
                          <Input
                            value={taskDraft.title}
                            onChange={(event) => setTaskDraft((prev) => ({ ...prev, title: event.target.value }))}
                            placeholder="Define mitigation"
                            className="h-9"
                          />
                          <Input
                            value={taskDraft.owner}
                            onChange={(event) => setTaskDraft((prev) => ({ ...prev, owner: event.target.value }))}
                            placeholder="Owner"
                            className="h-9"
                          />
                          <Button type="button" onClick={handleTaskAdd}>
                            Add
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {incident.workspace.tasks.length === 0 && (
                          <p className="text-sm text-muted-foreground">No workspace tasks yet. Capture mitigation steps here.</p>
                        )}
                        {incident.workspace.tasks.map((task) => (
                          <label key={task.id} className="flex items-center gap-3 text-sm">
                            <Checkbox
                              checked={task.status === "done"}
                              onCheckedChange={(checked) => {
                                const isChecked = checked === true;
                                updateWorkspaceTaskStatus(incident.id, task.id, isChecked ? "done" : "in_progress");
                                addIncidentTimelineEntry(incident.id, {
                                  actor: task.owner,
                                  action: `${isChecked ? "Completed" : "Reopened"} task: ${task.title}`,
                                });
                              }}
                            />
                            <span className={task.status === "done" ? "line-through" : ""}>{task.title}</span>
                            <Badge variant="outline" className="ml-auto text-xs">
                              {task.owner}
                            </Badge>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="font-semibold flex items-center gap-2">
                          <LinkIcon className="h-4 w-4" /> War room resources
                        </h4>
                        <div className="flex gap-2">
                          <Input
                            value={linkDraft.label}
                            onChange={(event) => setLinkDraft((prev) => ({ ...prev, label: event.target.value }))}
                            placeholder="Runbook or dashboard"
                            className="h-9"
                          />
                          <Input
                            value={linkDraft.url}
                            onChange={(event) => setLinkDraft((prev) => ({ ...prev, url: event.target.value }))}
                            placeholder="https://"
                            className="h-9"
                          />
                          <Button type="button" onClick={handleLinkAdd}>
                            Attach
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {incident.workspace.links.length === 0 && (
                          <p className="text-sm text-muted-foreground">Attach dashboards, chat channels, or feature flags here.</p>
                        )}
                        {incident.workspace.links.map((link) => (
                          <a
                            key={link.id}
                            href={link.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center justify-between rounded-md border p-2 text-sm hover:border-primary"
                          >
                            <span>{link.label}</span>
                            <LinkIcon className="h-4 w-4 text-muted-foreground" />
                          </a>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-lg p-4 space-y-3">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Timeline
                    </h4>
                    <div className="space-y-2 max-h-64 overflow-auto">
                      {incident.workspace.timeline.map((entry) => (
                        <div key={entry.id} className="flex items-start gap-3 text-sm">
                          <div className="text-xs text-muted-foreground min-w-[120px]">
                            {format(new Date(entry.timestamp), "MMM d HH:mm")}
                          </div>
                          <div className="font-medium">{entry.actor}</div>
                          <div className="text-muted-foreground">{entry.action}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <aside className="lg:col-span-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Service runbooks</CardTitle>
                      <CardDescription>
                        Automatically surface linked runbooks and tier-based checklists.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {incident.affectedServices.length === 0 && (
                        <p className="text-sm text-muted-foreground">No services linked. Add a service to unlock ownership context.</p>
                      )}
                      {incident.affectedServices.map((serviceId) => {
                        const service = services.find((item) => item.id === serviceId);
                        if (!service) return null;
                        return (
                          <div key={serviceId} className="border rounded-md p-3 space-y-2">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-semibold text-sm">{service.name}</p>
                                <p className="text-xs text-muted-foreground">Owned by {service.ownerTeam}</p>
                              </div>
                              <Badge variant="outline">{service.tier}</Badge>
                            </div>
                            <div className="space-y-1">
                              {service.runbooks.length === 0 ? (
                                <p className="text-xs text-muted-foreground">No runbooks uploaded yet.</p>
                              ) : (
                                service.runbooks.map((runbook) => (
                                  <a
                                    key={runbook.id}
                                    href={runbook.link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-2 text-xs text-primary hover:underline"
                                  >
                                    <LinkIcon className="h-3 w-3" /> {runbook.name}
                                  </a>
                                ))
                              )}
                            </div>
                            <div className="space-y-1">
                              {service.checklists.length === 0 && (
                                <p className="text-xs text-muted-foreground">No readiness checklist configured.</p>
                              )}
                              {service.checklists.map((item) => (
                                <label key={item.id} className="flex items-center gap-2 text-xs">
                                  <Checkbox
                                    checked={item.completed}
                                    onCheckedChange={() => {
                                      const nextState = !item.completed;
                                      toggleServiceChecklist(service.id, item.id, "Operations");
                                      addIncidentTimelineEntry(incident.id, {
                                        actor: "Operations",
                                        action: `${nextState ? "Completed" : "Reopened"} service checklist item: ${item.label}`,
                                      });
                                    }}
                                  />
                                  <span className={item.completed ? "line-through" : ""}>{item.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>

                  {incident.nearBreachEscalated && !incident.breachEscalated && (
                    <Card className="border-amber-200 bg-amber-50">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-amber-900">
                          <AlertTriangle className="h-4 w-4" /> SLA nearing breach
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-amber-900">
                        Notify escalation contacts to reinforce mitigation. Update responders with recovery ETA.
                      </CardContent>
                    </Card>
                  )}

                  {incident.breachEscalated && (
                    <Card className="border-destructive bg-destructive/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base flex items-center gap-2 text-destructive">
                          <AlertTriangle className="h-4 w-4" /> SLA breached
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-destructive">
                        SLA has breached. Ensure leadership is paged and initiate corrective actions per runbook.
                      </CardContent>
                    </Card>
                  )}
                </aside>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        {incidents.length === 0 && (
          <div className="text-center py-10 text-muted-foreground border rounded-lg">
            No incidents yet. Create your first incident to activate the workspace.
          </div>
        )}

        <Dialog open={postmortemIncidentId !== null} onOpenChange={(open) => !open && setPostmortemIncidentId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Capture postmortem</DialogTitle>
              <DialogDescription>
                Document impact, root cause, and corrective actions before closing this incident.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label htmlFor="postmortem-impact">Impact</Label>
                <Textarea
                  id="postmortem-impact"
                  value={postmortemDraft.impact}
                  onChange={(event) => setPostmortemDraft((prev) => ({ ...prev, impact: event.target.value }))}
                  placeholder="Describe customer impact, duration, and scope"
                />
              </div>
              <div>
                <Label htmlFor="postmortem-root">Root cause</Label>
                <Textarea
                  id="postmortem-root"
                  value={postmortemDraft.rootCause}
                  onChange={(event) => setPostmortemDraft((prev) => ({ ...prev, rootCause: event.target.value }))}
                  placeholder="What caused the incident? Include contributing factors"
                />
              </div>
              <div>
                <Label htmlFor="postmortem-corrective">Corrective actions</Label>
                <Textarea
                  id="postmortem-corrective"
                  value={postmortemDraft.correctiveActions}
                  onChange={(event) => setPostmortemDraft((prev) => ({ ...prev, correctiveActions: event.target.value }))}
                  placeholder="Long-term fixes to prevent recurrence"
                />
              </div>
              <div>
                <Label htmlFor="postmortem-actions">Action items</Label>
                <Textarea
                  id="postmortem-actions"
                  value={postmortemDraft.actionItems}
                  onChange={(event) => setPostmortemDraft((prev) => ({ ...prev, actionItems: event.target.value }))}
                  placeholder="List follow-up tasks, one per line"
                />
              </div>
              <div>
                <Label htmlFor="postmortem-owner">Captured by</Label>
                <Input
                  id="postmortem-owner"
                  value={postmortemDraft.createdBy}
                  onChange={(event) => setPostmortemDraft((prev) => ({ ...prev, createdBy: event.target.value }))}
                  placeholder="Incident commander"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                onClick={handlePostmortemSubmit}
                disabled={!postmortemDraft.impact || !postmortemDraft.rootCause || !postmortemDraft.correctiveActions || !postmortemDraft.createdBy}
              >
                Save postmortem & create action items
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
