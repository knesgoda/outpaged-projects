import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertTriangle, Plus, Clock, CheckCircle, Eye, AlertOctagon } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Severity = "sev1" | "sev2" | "sev3" | "sev4";
type IncidentStatus = "open" | "mitigated" | "monitoring" | "resolved";

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  status: IncidentStatus;
  affectedServices: string[];
  createdAt: string;
  resolvedAt?: string;
  timeline: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  timestamp: string;
  action: string;
  user: string;
}

const SEVERITY_CONFIG = {
  sev1: { label: "Sev 1", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: AlertOctagon, sla: 15 },
  sev2: { label: "Sev 2", color: "bg-orange-500/10 text-orange-500 border-orange-500/20", icon: AlertTriangle, sla: 60 },
  sev3: { label: "Sev 3", color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20", icon: AlertTriangle, sla: 240 },
  sev4: { label: "Sev 4", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: AlertTriangle, sla: 1440 },
};

const STATUS_CONFIG = {
  open: { label: "Open", color: "bg-red-500/10 text-red-500", icon: AlertOctagon },
  mitigated: { label: "Mitigated", color: "bg-orange-500/10 text-orange-500", icon: Clock },
  monitoring: { label: "Monitoring", color: "bg-yellow-500/10 text-yellow-500", icon: Eye },
  resolved: { label: "Resolved", color: "bg-green-500/10 text-green-500", icon: CheckCircle },
};

export function IncidentManager() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newIncident, setNewIncident] = useState({
    title: "",
    description: "",
    severity: "sev3" as Severity,
    affectedServices: "",
  });

  const createIncident = () => {
    if (!newIncident.title || !newIncident.description) {
      toast.error("Title and description are required");
      return;
    }

    const incident: Incident = {
      id: `INC-${Date.now()}`,
      title: newIncident.title,
      description: newIncident.description,
      severity: newIncident.severity,
      status: "open",
      affectedServices: newIncident.affectedServices.split(",").map(s => s.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
      timeline: [
        {
          id: `event_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: "Incident created",
          user: "Current User",
        },
      ],
    };

    setIncidents([incident, ...incidents]);
    setNewIncident({ title: "", description: "", severity: "sev3", affectedServices: "" });
    setIsCreating(false);
    toast.success(`Incident ${incident.id} created`);

    // Simulate Sev1 paging
    if (incident.severity === "sev1") {
      toast.info("On-call engineer has been paged", {
        description: "Response expected within 15 minutes",
      });
    }
  };

  const updateStatus = (incidentId: string, status: IncidentStatus) => {
    setIncidents(incidents.map(inc => {
      if (inc.id === incidentId) {
        const newTimeline = [...inc.timeline, {
          id: `event_${Date.now()}`,
          timestamp: new Date().toISOString(),
          action: `Status changed to ${status}`,
          user: "Current User",
        }];

        return {
          ...inc,
          status,
          resolvedAt: status === "resolved" ? new Date().toISOString() : inc.resolvedAt,
          timeline: newTimeline,
        };
      }
      return inc;
    }));
    toast.success(`Incident status updated to ${status}`);
  };

  const getSLARemaining = (incident: Incident) => {
    const config = SEVERITY_CONFIG[incident.severity];
    const createdTime = new Date(incident.createdAt).getTime();
    const now = Date.now();
    const elapsed = Math.floor((now - createdTime) / 60000); // minutes
    const remaining = config.sla - elapsed;
    return { remaining, breached: remaining < 0 };
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Incident Management</h2>
          <p className="text-muted-foreground">Track and resolve critical incidents</p>
        </div>
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Incident
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Incident</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Brief description of the incident"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={newIncident.severity}
                  onValueChange={(value: Severity) => setNewIncident({ ...newIncident, severity: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sev1">Sev 1 - Critical (15 min SLA)</SelectItem>
                    <SelectItem value="sev2">Sev 2 - High (1 hour SLA)</SelectItem>
                    <SelectItem value="sev3">Sev 3 - Medium (4 hour SLA)</SelectItem>
                    <SelectItem value="sev4">Sev 4 - Low (24 hour SLA)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Detailed description of the incident"
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="services">Affected Services</Label>
                <Input
                  id="services"
                  placeholder="e.g., API, Database, Frontend (comma-separated)"
                  value={newIncident.affectedServices}
                  onChange={(e) => setNewIncident({ ...newIncident, affectedServices: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button onClick={createIncident}>
                Create Incident
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {incidents.map(incident => {
          const severityConfig = SEVERITY_CONFIG[incident.severity];
          const statusConfig = STATUS_CONFIG[incident.status];
          const sla = getSLARemaining(incident);
          const SeverityIcon = severityConfig.icon;
          const StatusIcon = statusConfig.icon;

          return (
            <Card key={incident.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs font-mono">
                        {incident.id}
                      </Badge>
                      <Badge variant="outline" className={cn(severityConfig.color)}>
                        <SeverityIcon className="h-3 w-3 mr-1" />
                        {severityConfig.label}
                      </Badge>
                      <Badge variant="outline" className={cn(statusConfig.color)}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig.label}
                      </Badge>
                      {incident.status !== "resolved" && sla.breached && (
                        <Badge variant="destructive" className="text-xs">
                          SLA Breached
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-lg mb-2">{incident.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{incident.description}</p>
                    {incident.affectedServices.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {incident.affectedServices.map(service => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {incident.status === "open" && (
                      <Button size="sm" onClick={() => updateStatus(incident.id, "mitigated")}>
                        Mitigate
                      </Button>
                    )}
                    {incident.status === "mitigated" && (
                      <Button size="sm" onClick={() => updateStatus(incident.id, "monitoring")}>
                        Start Monitoring
                      </Button>
                    )}
                    {incident.status === "monitoring" && (
                      <Button size="sm" onClick={() => updateStatus(incident.id, "resolved")}>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolve
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Timeline</h4>
                  <div className="space-y-2">
                    {incident.timeline.map(event => (
                      <div key={event.id} className="flex items-start gap-3 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <span className="text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                          <span className="mx-2">•</span>
                          <span>{event.action}</span>
                          <span className="mx-2">•</span>
                          <span className="text-muted-foreground">{event.user}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {incidents.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No Active Incidents</h3>
              <p className="text-muted-foreground mb-4">
                All systems operational
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
