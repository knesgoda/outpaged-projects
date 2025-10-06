import { useEffect, useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGoal, useGoalKeyResults, useGoalUpdates } from "@/hooks/useGoals";
import type { Goal } from "@/types";

const STATUS_LABELS: Record<Goal["status"], string> = {
  on_track: "On track",
  at_risk: "At risk",
  off_track: "Off track",
  paused: "Paused",
  done: "Done",
  archived: "Archived",
};

const STATUS_VARIANTS: Record<Goal["status"], string> = {
  on_track: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
  at_risk: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
  off_track: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
  paused: "bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300",
  done: "bg-primary/10 text-primary",
  archived: "bg-muted text-muted-foreground",
};

function StatusPill({ status }: { status: Goal["status"] }) {
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_VARIANTS[status]}`}>{STATUS_LABELS[status]}</span>;
}

export function GoalDetailView({ goalId, projectId }: { goalId: string; projectId?: string }) {
  const navigate = useNavigate();
  const { data: goal, isLoading, isError, error } = useGoal(goalId);
  const { data: keyResults, isLoading: loadingKRs } = useGoalKeyResults(goalId);
  const { data: updates, isLoading: loadingUpdates } = useGoalUpdates(goalId);

  useEffect(() => {
    if (goal?.title) {
      document.title = projectId ? `Projects / ${projectId} / Goals / ${goal.title}` : `Goals / ${goal.title}`;
    }
  }, [goal?.title, projectId]);

  const progressValue = goal?.progress ?? 0;
  const parentLink = goal?.parent_goal_id ? (
    <Link
      className="font-medium text-primary"
      to={projectId ? `/projects/${projectId}/goals/${goal.parent_goal_id}` : `/goals/${goal.parent_goal_id}`}
    >
      View parent goal
    </Link>
  ) : null;

  const alignmentText = useMemo(() => {
    if (!goal?.parent_goal_id) return "Top level objective";
    return "Aligned to a parent goal";
  }, [goal?.parent_goal_id]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Card>
          <CardContent className="space-y-4 p-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !goal) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(error as Error)?.message ?? "Goal not found or you do not have access."}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{alignmentText}</span>
            {parentLink}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{goal.title}</h1>
          {goal.description && <p className="max-w-3xl text-sm text-muted-foreground">{goal.description}</p>}
          <div className="flex items-center gap-2">
            <StatusPill status={goal.status} />
            {goal.is_private && <Badge variant="outline">Private</Badge>}
            <span className="text-xs text-muted-foreground">Weight {goal.weight}</span>
          </div>
        </div>
        <div className="w-full max-w-xs rounded-lg border p-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-muted-foreground">Progress</span>
            <span className="font-semibold text-foreground">{progressValue.toFixed(0)}%</span>
          </div>
          <Progress value={progressValue} className="mt-2" />
          <div className="mt-4 flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              Back
            </Button>
            <Button onClick={() => navigate(projectId ? `/projects/${projectId}/goals/${goalId}/edit` : `/goals/${goalId}/edit`)}>
              Edit goal
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList className="w-full justify-start">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="key-results">Key results</TabsTrigger>
          <TabsTrigger value="updates">Updates</TabsTrigger>
          <TabsTrigger value="alignment">Alignment</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Goal summary</CardTitle>
              <CardDescription>Use this section to share context with collaborators.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-center justify-between">
                <span>Created</span>
                <span>{new Date(goal.created_at).toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated</span>
                <span>{new Date(goal.updated_at).toLocaleString()}</span>
              </div>
              {goal.project_id && (
                <div className="flex items-center justify-between">
                  <span>Project</span>
                  <Link to={`/projects/${goal.project_id}/goals`} className="font-medium text-primary">
                    View project goals
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="key-results">
          <Card>
            <CardHeader>
              <CardTitle>Key results</CardTitle>
              <CardDescription>Track measurable outcomes that roll up to this goal.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingKRs ? (
                <Skeleton className="h-24 w-full" />
              ) : keyResults && keyResults.length > 0 ? (
                <div className="space-y-3">
                  {keyResults.map((kr) => (
                    <div key={kr.id} className="rounded-md border p-4">
                      <p className="font-medium text-foreground">{kr.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Weight {kr.weight} • Current {kr.metric_current ?? "-"} / Target {kr.metric_target ?? "-"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No key results yet. Add one to measure progress.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="updates">
          <Card>
            <CardHeader>
              <CardTitle>Recent updates</CardTitle>
              <CardDescription>Share status notes to keep stakeholders informed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingUpdates ? (
                <Skeleton className="h-24 w-full" />
              ) : updates && updates.length > 0 ? (
                <div className="space-y-3">
                  {updates.map((update) => (
                    <div key={update.id} className="rounded-md border p-4">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline">{STATUS_LABELS[update.status as Goal["status"]] ?? update.status}</Badge>
                        <span className="text-xs text-muted-foreground">{new Date(update.created_at).toLocaleString()}</span>
                      </div>
                      {update.note && <p className="mt-2 text-sm text-muted-foreground">{update.note}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No updates recorded yet.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alignment">
          <Card>
            <CardHeader>
              <CardTitle>Alignment</CardTitle>
              <CardDescription>See how this goal connects to broader initiatives.</CardDescription>
            </CardHeader>
            <CardContent>
              {goal.parent_goal_id ? (
                <p className="text-sm text-muted-foreground">
                  This goal inherits alignment from its parent goal. Follow the link above to review the full tree.
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Child goals will appear here once added.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function GoalDetailPage() {
  const { goalId } = useParams<{ goalId: string }>();
  if (!goalId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Goal not found.</AlertDescription>
      </Alert>
    );
  }
  return <GoalDetailView goalId={goalId} />;
}
