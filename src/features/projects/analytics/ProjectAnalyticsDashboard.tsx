import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { ProjectSummary } from "@/pages/ia/projects/ProjectPageTemplate";
import { formatDistanceToNow, parseISO } from "date-fns";
import { useProjectAnalytics } from "./useProjectAnalytics";
import type { ProjectAnalyticsSummary } from "./useProjectAnalytics";

const COLORS = ["#6366F1", "#22D3EE", "#F97316", "#F43F5E", "#84CC16", "#10B981", "#A855F7"];

interface ProjectAnalyticsDashboardProps {
  projectId: string;
  project: ProjectSummary | null;
  isProjectLoading: boolean;
}

export function ProjectAnalyticsDashboard({
  projectId,
  project,
  isProjectLoading,
}: ProjectAnalyticsDashboardProps) {
  const { analytics, isLoading } = useProjectAnalytics(projectId);
  const loading = isProjectLoading || isLoading;
  const { toast } = useToast();

  const exportPayload = useMemo(() => {
    if (loading) return null;
    const payload = {
      project: {
        id: project?.id,
        name: project?.name,
        status: project?.status,
      },
      generatedAt: analytics.generatedAt,
      metrics: {
        openTasks: analytics.openTasks,
        createdLast7Days: analytics.createdLast7Days,
        completedLast7Days: analytics.completedLast7Days,
        dueSoon: analytics.dueSoon.length,
        overdue: analytics.overdue.length,
        sla: analytics.sla.totals,
      },
      risks: analytics.risks,
      workload: analytics.workload,
      notifications: analytics.deliveryLog,
    };
    return JSON.stringify(payload, null, 2);
  }, [analytics, loading, project?.id, project?.name, project?.status]);

  const handleExport = () => {
    if (!exportPayload) return;
    if (typeof window === "undefined") return;
    const blob = new Blob([exportPayload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project?.name ?? "project"}-analytics.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ description: "Analytics exported." });
  };

  if (loading) {
    return (
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Project health snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Generated {formatDistanceToNow(new Date(analytics.generatedAt), { addSuffix: true })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={handleExport} disabled={!exportPayload}>
            Export JSON
          </Button>
          <Button size="sm" asChild variant="outline">
            <Link to={`/projects/${projectId}/reports`}>Open analytics builder</Link>
          </Button>
        </div>
      </div>

      <KpiGrid analytics={analytics} projectId={projectId} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Workload distribution</CardTitle>
                <CardDescription>Track open work and urgent tasks by owner.</CardDescription>
              </div>
              <Button size="sm" asChild variant="ghost">
                <Link to={`/projects/${projectId}/tasks?view=workload`}>Drill into board</Link>
              </Button>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.workload}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="assigneeName" hide={analytics.workload.length > 6} angle={-25} interval={0} />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="openTasks" name="Open tasks" fill="#6366F1" />
                  <Bar dataKey="urgent" name="Urgent" fill="#F43F5E" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>SLA performance</CardTitle>
                <CardDescription>Monitor policy health and breaches.</CardDescription>
              </div>
              <Button size="sm" asChild variant="ghost">
                <Link to={`/projects/${projectId}/settings#sla`}>Adjust policies</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {analytics.sla.policies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No SLA policies configured.</p>
              ) : (
                analytics.sla.policies.map((policy) => (
                  <div key={policy.policyId} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{policy.policyName}</p>
                        <p className="text-xs text-muted-foreground">
                          {policy.totalTasks} tasks monitored • {policy.breached} breached • {policy.atRisk} at risk
                        </p>
                      </div>
                      <Badge variant={policy.breached > 0 ? "destructive" : "secondary"}>
                        {policy.breached > 0 ? "Attention" : "Healthy"}
                      </Badge>
                    </div>
                    <Progress value={progressPercentage(policy)} />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Risk register</CardTitle>
                <CardDescription>Surface blocked and overdue work items.</CardDescription>
              </div>
              <Button size="sm" asChild variant="ghost">
                <Link to={`/projects/${projectId}/tasks?filter=risk`}>View risky tasks</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {analytics.risks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active risks detected.</p>
              ) : (
                <ScrollArea className="h-64 pr-4">
                  <ul className="space-y-3">
                    {analytics.risks.map((risk) => (
                      <li key={risk.taskId} className="rounded-lg border border-border/60 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium leading-tight">{risk.title}</p>
                          <Badge variant={riskSeverityToVariant(risk.severity)} className="text-xs">
                            {risk.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{risk.reason}</p>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          {risk.dueDate ? (
                            <span>Due {formatDistanceToNow(parseISO(risk.dueDate), { addSuffix: true })}</span>
                          ) : null}
                          {risk.assignees.length > 0 ? <span>Owners: {risk.assignees.join(", ")}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Status breakdown</CardTitle>
              <CardDescription>Distribution of task states across the project.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip />
                  <Pie data={analytics.statusBreakdown} dataKey="value" nameKey="status" innerRadius={50}>
                    {analytics.statusBreakdown.map((entry, index) => (
                      <Cell key={entry.status} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>Priority mix</CardTitle>
              <CardDescription>Use this to validate commitment balancing.</CardDescription>
            </CardHeader>
            <CardContent className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.priorityBreakdown}>
                  <defs>
                    <linearGradient id="priorityGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="priority" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#F97316" fill="url(#priorityGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Notification digests & automations</CardTitle>
                <CardDescription>Understand which channels surface project activity.</CardDescription>
              </div>
              <Button size="sm" asChild variant="ghost">
                <Link to={`/projects/${projectId}/settings#notifications`}>Configure delivery</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Digests</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {analytics.digestSummary.digests.map((digest) => (
                    <li key={digest.id} className="rounded-md border border-border/60 p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{digest.name}</span>
                        <Badge variant="outline">{digest.cadence}</Badge>
                      </div>
                      <p>
                        Next send {formatDistanceToNow(parseISO(digest.nextSendAt), { addSuffix: true })} •
                        Channels: {digest.channels.join(", ")} • Recipients: {digest.recipients}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Upcoming automation runs</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  {analytics.digestSummary.upcomingAutomationRuns.map((run) => (
                    <li key={run.id} className="rounded-md border border-border/60 p-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">{run.name}</span>
                        <Badge variant={run.status === "paused" ? "destructive" : "outline"}>{run.status}</Badge>
                      </div>
                      <p>
                        Next run {formatDistanceToNow(parseISO(run.nextRunAt), { addSuffix: true })} • cadence {run.cadence}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-semibold">Recent deliveries</h4>
                <ScrollArea className="h-40 pr-3">
                  <ul className="space-y-2 text-xs text-muted-foreground">
                    {analytics.deliveryLog.map((entry) => (
                      <li key={entry.id} className="rounded-md border border-border/60 p-2">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-foreground">{entry.summary}</span>
                          <Badge variant="outline">{entry.trigger}</Badge>
                        </div>
                        <p>
                          Sent {formatDistanceToNow(parseISO(entry.deliveredAt), { addSuffix: true })} via {entry.channels.join(", ")}
                        </p>
                      </li>
                    ))}
                  </ul>
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>Custom field insights</CardTitle>
          <CardDescription>Summaries calculated from project-level metadata.</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.customFieldInsights.length === 0 ? (
            <p className="text-sm text-muted-foreground">No custom field usage captured yet.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {analytics.customFieldInsights.map((insight) => (
                <div key={insight.field} className="rounded-lg border border-border/60 p-3">
                  <p className="text-sm font-semibold">{insight.field}</p>
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {insight.topValues.map((value) => (
                      <li key={value.value} className="flex items-center justify-between">
                        <span>{value.value}</span>
                        <span className="font-medium text-foreground">{value.count}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function riskSeverityToVariant(severity: "high" | "medium" | "low") {
  if (severity === "high") return "destructive" as const;
  if (severity === "medium") return "secondary" as const;
  return "outline" as const;
}

function progressPercentage(policy: ProjectAnalyticsSummary["sla"]["policies"][number]) {
  const total = policy.totalTasks || 1;
  const healthy = policy.onTrack + policy.met;
  return Math.round((healthy / total) * 100);
}

interface KpiGridProps {
  analytics: ProjectAnalyticsSummary;
  projectId: string;
}

function KpiGrid({ analytics, projectId }: KpiGridProps) {
  const completionRate = analytics.createdLast7Days > 0
    ? Math.round((analytics.completedLast7Days / analytics.createdLast7Days) * 100)
    : analytics.completedLast7Days > 0
      ? 100
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Open tasks</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{analytics.openTasks}</p>
          <p className="text-xs text-muted-foreground">{analytics.createdLast7Days} new in the last 7 days</p>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Completion rate (7d)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold">{completionRate}%</p>
          <p className="text-xs text-muted-foreground">{analytics.completedLast7Days} completed recently</p>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">Due soon</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-semibold">{analytics.dueSoon.length}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={analytics.dueSoon.length > 0 ? "secondary" : "outline"}>
              {analytics.dueSoon.length > 0 ? "Action required" : "Clear"}
            </Badge>
            <Link to={`/projects/${projectId}/tasks?filter=due-soon`} className="underline">
              View list
            </Link>
          </div>
        </CardContent>
      </Card>
      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">SLA breaches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-3xl font-semibold">{analytics.sla.totals.breached}</p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant={analytics.sla.totals.breached > 0 ? "destructive" : "outline"}>
              {analytics.sla.totals.breached > 0 ? "Escalate" : "Healthy"}
            </Badge>
            <Link to={`/projects/${projectId}/reports?view=sla`} className="underline">
              View details
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
