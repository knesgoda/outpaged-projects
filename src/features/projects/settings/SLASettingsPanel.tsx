import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  evaluateProjectSLA,
  getSLABreachLog,
  listSLAPolicies,
  upsertSLAPolicy,
  type SLAPolicy,
} from "@/services/projects/projectSLAService";
import { useProjectAnalytics } from "@/features/projects/analytics/useProjectAnalytics";

interface SLASettingsPanelProps {
  projectId: string;
}

export function SLASettingsPanel({ projectId }: SLASettingsPanelProps) {
  const [policies, setPolicies] = useState<SLAPolicy[]>(() => listSLAPolicies(projectId));
  const { toast } = useToast();
  const { analytics } = useProjectAnalytics(projectId);

  const snapshot = useMemo(() => evaluateProjectSLA(projectId, analytics.tasks), [projectId, analytics.generatedAt]);
  const breaches = useMemo(() => getSLABreachLog(projectId).slice(-10).reverse(), [projectId, snapshot.generatedAt]);

  const handleToggle = (policyId: string, enabled: boolean) => {
    const policy = policies.find((entry) => entry.id === policyId);
    if (!policy) return;
    const updated = upsertSLAPolicy(projectId, { ...policy, active: enabled });
    setPolicies((prev) => prev.map((entry) => (entry.id === updated.id ? updated : entry)));
    toast({ description: `${updated.name} ${enabled ? "activated" : "paused"}.` });
  };

  return (
    <Card id="sla" className="border-border/70">
      <CardHeader>
        <CardTitle>SLA policies</CardTitle>
        <CardDescription>Define, monitor, and escalate service level promises.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-2">
          {policies.map((policy) => {
            const evaluation = snapshot.policies.find((entry) => entry.policyId === policy.id);
            const onTrack = evaluation ? evaluation.onTrack + evaluation.met : 0;
            const total = evaluation ? evaluation.totalTasks || 1 : 1;
            const percentage = Math.round((onTrack / total) * 100);
            return (
              <div key={policy.id} className="rounded-lg border border-border/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">{policy.name}</p>
                    {policy.description ? (
                      <p className="text-xs text-muted-foreground">{policy.description}</p>
                    ) : null}
                  </div>
                  <Switch checked={policy.active} onCheckedChange={(value) => handleToggle(policy.id, value)} />
                </div>
                <div className="mt-3">
                  <Progress value={percentage} />
                  {evaluation ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {evaluation.onTrack} on track • {evaluation.atRisk} at risk • {evaluation.breached} breached
                    </p>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline">{policy.notificationChannels.join(", ")}</Badge>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Recent breaches</h3>
          <ScrollArea className="mt-2 h-48 rounded-lg border border-border/60">
            <ul className="space-y-2 p-3 text-xs text-muted-foreground">
              {breaches.length === 0 ? (
                <li className="text-muted-foreground">No breaches recorded.</li>
              ) : (
                breaches.map((breach) => (
                  <li key={breach.id} className="rounded-md border border-border/60 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-foreground">{breach.taskTitle}</span>
                      <Badge variant="destructive">{breach.status}</Badge>
                    </div>
                    <p className="mt-1">
                      Policy {breach.policyId} • {new Date(breach.occurredAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
