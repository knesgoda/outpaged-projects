import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useProjectId } from "@/hooks/useProjectId";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface TaskRow {
  id: string;
  status: string | null;
  team_assigned: string | null;
  story_points: number | null;
  blocked: boolean | null;
}

export default function ProjectTeamsPage() {
  const projectId = useProjectId() ?? "";
  useDocumentTitle(`Projects / ${projectId || "Project"} / Teams`);

  const tasksQuery = useQuery<TaskRow[]>({
    queryKey: ["project", projectId, "team-work"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error } = await supabase
        .from("tasks")
        .select("id, status, team_assigned, story_points, blocked")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (error) {
        throw error;
      }

      return (data as TaskRow[]) ?? [];
    },
  });

  const teams = useMemo(() => {
    const aggregate = new Map<
      string,
      {
        total: number;
        inProgress: number;
        done: number;
        blocked: number;
        storyPoints: number;
      }
    >();

    for (const task of tasksQuery.data ?? []) {
      const key = task.team_assigned?.trim() || "Unassigned";
      const bucket = aggregate.get(key) ?? { total: 0, inProgress: 0, done: 0, blocked: 0, storyPoints: 0 };
      bucket.total += 1;
      if (task.blocked) bucket.blocked += 1;
      if ((task.status ?? "todo").toLowerCase() === "done") {
        bucket.done += 1;
      } else {
        bucket.inProgress += 1;
      }
      if (typeof task.story_points === "number" && !Number.isNaN(task.story_points)) {
        bucket.storyPoints += task.story_points;
      }
      aggregate.set(key, bucket);
    }

    return Array.from(aggregate.entries())
      .map(([team, data]) => ({ team, ...data }))
      .sort((left, right) => right.total - left.total);
  }, [tasksQuery.data]);

  const overall = useMemo(() => {
    if (!teams.length) {
      return { total: 0, done: 0, blocked: 0 };
    }
    return teams.reduce(
      (acc, team) => ({
        total: acc.total + team.total,
        done: acc.done + team.done,
        blocked: acc.blocked + team.blocked,
      }),
      { total: 0, done: 0, blocked: 0 },
    );
  }, [teams]);

  return (
    <section className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Project teams</h1>
        <p className="text-sm text-muted-foreground">See workload, throughput, and risk by team assignment.</p>
      </header>

      {tasksQuery.error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load team data</AlertTitle>
          <AlertDescription>
            {tasksQuery.error instanceof Error ? tasksQuery.error.message : "Try reloading the page."}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Items tracked</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{overall.total}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksQuery.isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-semibold">{overall.done}</p>
                <Progress value={overall.total ? (overall.done / overall.total) * 100 : 0} className="h-2" />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            {tasksQuery.isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-semibold">{overall.blocked}</p>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle>Teams</CardTitle>
          <CardDescription>Breakdown of items, progress, and blockers by team.</CardDescription>
        </CardHeader>
        <CardContent>
          {tasksQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">No teams have been assigned to items in this project.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>In progress</TableHead>
                  <TableHead>Done</TableHead>
                  <TableHead>Blocked</TableHead>
                  <TableHead>Story points</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map(team => (
                  <TableRow key={team.team}>
                    <TableCell className="font-medium">{team.team}</TableCell>
                    <TableCell>{team.total}</TableCell>
                    <TableCell>{team.inProgress}</TableCell>
                    <TableCell>{team.done}</TableCell>
                    <TableCell className={team.blocked > 0 ? "text-destructive" : undefined}>{team.blocked}</TableCell>
                    <TableCell>{team.storyPoints}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
