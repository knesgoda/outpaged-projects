import { useState } from "react";
import { AlertOctagon, Database, Server } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useOperations } from "./OperationsProvider";

export function ResiliencePerformancePanel() {
  const { performanceGuardrails, backupJobs, failoverDrills, definePerformanceGuardrail, recordBackupJob, recordFailoverDrill } = useOperations();
  const [guardrailDraft, setGuardrailDraft] = useState({ name: "API latency", metric: "p95_latency", threshold: 500, status: "passing" });
  const [backupDraft, setBackupDraft] = useState({ projectId: "project-123" });
  const [drillDraft, setDrillDraft] = useState({ name: "Quarterly failover", status: "pending" as "pending" | "completed" | "in_progress" });

  const handleCreateGuardrail = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    definePerformanceGuardrail({
      name: guardrailDraft.name,
      metric: guardrailDraft.metric,
      threshold: Number(guardrailDraft.threshold),
      status: guardrailDraft.status as "passing" | "failing",
    });
    setGuardrailDraft({ name: "API latency", metric: "p95_latency", threshold: 500, status: "passing" });
  };

  const handleBackup = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordBackupJob({ projectId: backupDraft.projectId });
    setBackupDraft({ projectId: "project-123" });
  };

  const handleDrill = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    recordFailoverDrill({ name: drillDraft.name, status: drillDraft.status });
    setDrillDraft({ name: "Quarterly failover", status: "pending" });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Performance & resilience</CardTitle>
        <CardDescription>
          Track guardrails, automate daily backups, and rehearse multi-region failover drills.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleCreateGuardrail} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-3 space-y-2">
            <Label>Guardrail</Label>
            <Input
              value={guardrailDraft.name}
              onChange={(event) => setGuardrailDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="API latency"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Metric</Label>
            <Input
              value={guardrailDraft.metric}
              onChange={(event) => setGuardrailDraft((prev) => ({ ...prev, metric: event.target.value }))}
              placeholder="p95_latency"
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Threshold</Label>
            <Input
              type="number"
              value={guardrailDraft.threshold}
              onChange={(event) => setGuardrailDraft((prev) => ({ ...prev, threshold: Number(event.target.value) }))}
            />
          </div>
          <div className="lg:col-span-3 space-y-2">
            <Label>Status</Label>
            <Select value={guardrailDraft.status} onValueChange={(value) => setGuardrailDraft((prev) => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="passing">Passing</SelectItem>
                <SelectItem value="failing">Failing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-12 flex justify-end">
            <Button type="submit">Save guardrail</Button>
          </div>
        </form>

        <div className="space-y-3 text-sm">
          {performanceGuardrails.length === 0 ? (
            <p className="text-muted-foreground">No guardrails defined.</p>
          ) : (
            performanceGuardrails.map((guardrail) => (
              <Card key={guardrail.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-4 w-4" /> {guardrail.name}
                  </CardTitle>
                  <CardDescription>
                    Metric {guardrail.metric} ≤ {guardrail.threshold}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Badge variant={guardrail.status === "passing" ? "secondary" : "destructive"}>{guardrail.status}</Badge>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleBackup} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label htmlFor="backup-project">Project ID</Label>
            <Input
              id="backup-project"
              value={backupDraft.projectId}
              onChange={(event) => setBackupDraft({ projectId: event.target.value })}
            />
          </div>
          <div className="lg:col-span-8 flex items-end justify-end">
            <Button type="submit">
              <Database className="h-4 w-4 mr-2" /> Record backup
            </Button>
          </div>
        </form>

        <div className="space-y-3 text-sm">
          {backupJobs.length === 0 ? (
            <p className="text-muted-foreground">Backups will appear here.</p>
          ) : (
            backupJobs.map((job) => (
              <Card key={job.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Backup {job.projectId}</CardTitle>
                  <CardDescription>Requested {new Date(job.requestedAt).toLocaleString()}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>

        <form onSubmit={handleDrill} className="grid gap-4 lg:grid-cols-12 border rounded-lg p-4">
          <div className="lg:col-span-4 space-y-2">
            <Label>Drill name</Label>
            <Input
              value={drillDraft.name}
              onChange={(event) => setDrillDraft((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Quarterly failover"
            />
          </div>
          <div className="lg:col-span-4 space-y-2">
            <Label>Status</Label>
            <Select value={drillDraft.status} onValueChange={(value) => setDrillDraft((prev) => ({ ...prev, status: value as typeof prev.status }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-4 flex items-end justify-end">
            <Button type="submit">
              <AlertOctagon className="h-4 w-4 mr-2" /> Log drill
            </Button>
          </div>
        </form>

        <div className="space-y-3 text-sm">
          {failoverDrills.length === 0 ? (
            <p className="text-muted-foreground">Log failover rehearsals to build multi-region confidence.</p>
          ) : (
            failoverDrills.map((drill) => (
              <Card key={drill.id} className="border-dashed">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{drill.name}</CardTitle>
                  <CardDescription>Status {drill.status}</CardDescription>
                </CardHeader>
              </Card>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
