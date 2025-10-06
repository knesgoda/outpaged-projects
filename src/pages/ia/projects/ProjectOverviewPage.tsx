import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ProjectPageTemplate, type ProjectSummary } from "./ProjectPageTemplate";
import { LinkedResourcesPanel } from "@/components/linked/LinkedResourcesPanel";
import { supabase } from "@/integrations/supabase/client";

type TaskSnapshot = {
  id: string;
  title: string | null;
  status: string | null;
  due_date: string | null;
  updated_at: string | null;
  priority: string | null;
};

export default function ProjectOverviewPage() {
  return (
    <ProjectPageTemplate
      title="Overview"
      description="Track health, deadlines, and linked work for this project."
    >
      {({ projectId, project, isLoading }) => (
        <OverviewContent projectId={projectId} project={project} isProjectLoading={isLoading} />
      )}
    </ProjectPageTemplate>
  );
}

function OverviewContent({
  projectId,
  project,
  isProjectLoading,
}: {
  projectId: string;
  project: ProjectSummary | null;
  isProjectLoading: boolean;
}) {
  const {
    data: tasks = [],
    isLoading: loadingTasks,
  } = useQuery<TaskSnapshot[]>({
    queryKey: ["project-overview", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];

      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, due_date, updated_at, priority")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(200);

      if (error) {
        throw error;
      }

      return (data as TaskSnapshot[]) ?? [];
    },
    staleTime: 1000 * 10,
  });

  const summary = useMemo(() => buildTaskSummary(tasks), [tasks]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <div className="space-y-6">
        <ProjectSnapshotCard project={project} tasksLoaded={!loadingTasks} summary={summary} loading={isProjectLoading} />
        <StatusBreakdownCard loading={loadingTasks} summary={summary} />
        <RecentUpdatesCard loading={loadingTasks} tasks={tasks} />
      </div>
      <div className="space-y-6">
        <UpcomingDeadlinesCard loading={loadingTasks} tasks={tasks} />
        <LinkedResourcesPanel entityType="project" entityId={projectId} projectId={projectId} />
      </div>
    </div>
  );
}

function ProjectSnapshotCard({
  project,
  tasksLoaded,
  summary,
  loading,
}: {
  project: ProjectSummary | null;
  tasksLoaded: boolean;
  summary: ReturnType<typeof buildTaskSummary>;
  loading: boolean;
}) {
  const statusLabel = project?.status ? formatStatus(project.status) : "Not set";

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Project snapshot</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        {loading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Status</span>
              <Badge variant="outline" className="capitalize text-xs">
                {statusLabel}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Owner</span>
              <span>{project?.owner?.full_name ?? "Unassigned"}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>Timeline</span>
              <span>
                {formatDate(project?.start_date)} – {formatDate(project?.end_date)}
              </span>
            </div>
          </>
        )}

        <Separator className="my-2" />

        {tasksLoaded ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Total tasks</span>
            <span>{summary.total}</span>
          </div>
        ) : (
          <Skeleton className="h-5 w-full" />
        )}
        {tasksLoaded ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Open</span>
            <span>{summary.open}</span>
          </div>
        ) : (
          <Skeleton className="h-5 w-full" />
        )}
        {tasksLoaded ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Overdue</span>
            <span className={summary.overdue > 0 ? "text-destructive" : ""}>{summary.overdue}</span>
          </div>
        ) : (
          <Skeleton className="h-5 w-full" />
        )}
      </CardContent>
    </Card>
  );
}

function StatusBreakdownCard({
  loading,
  summary,
}: {
  loading: boolean;
  summary: ReturnType<typeof buildTaskSummary>;
}) {
  const entries = Object.entries(summary.statusCounts).sort((a, b) => b[1] - a[1]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Status breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : entries.length === 0 ? (
          <p>No tasks yet.</p>
        ) : (
          entries.map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <span className="capitalize">{formatStatus(status)}</span>
              <span>{count}</span>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function RecentUpdatesCard({
  loading,
  tasks,
}: {
  loading: boolean;
  tasks: TaskSnapshot[];
}) {
  const recent = tasks.slice(0, 5);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Recent updates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-5 w-3/5" />
          </div>
        ) : recent.length === 0 ? (
          <p>No updates recorded.</p>
        ) : (
          recent.map((task) => (
            <div key={task.id} className="rounded-md border bg-card/80 px-3 py-2">
              <p className="font-medium text-foreground">
                {task.title ?? "Untitled task"}
              </p>
              <p className="text-xs text-muted-foreground">
                Status: {formatStatus(task.status)} • Updated {formatRelativeDate(task.updated_at)}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function UpcomingDeadlinesCard({
  loading,
  tasks,
}: {
  loading: boolean;
  tasks: TaskSnapshot[];
}) {
  const upcoming = useMemo(() => {
    const now = new Date();
    return tasks
      .filter((task) => task.due_date && new Date(task.due_date) >= now)
      .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime())
      .slice(0, 3);
  }, [tasks]);

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle className="text-base font-semibold">Upcoming due dates</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        ) : upcoming.length === 0 ? (
          <p>No upcoming deadlines.</p>
        ) : (
          upcoming.map((task) => (
            <div key={task.id} className="rounded-md border px-3 py-2">
              <p className="font-medium text-foreground">{task.title ?? "Untitled task"}</p>
              <p className="text-xs text-muted-foreground">
                Due {formatDate(task.due_date)} • Priority {task.priority ?? "n/a"}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function buildTaskSummary(tasks: TaskSnapshot[]) {
  const statusCounts: Record<string, number> = {};
  let overdue = 0;
  let open = 0;

  const now = new Date();

  tasks.forEach((task) => {
    const statusKey = task.status ?? "unknown";
    statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;

    if (!isClosed(statusKey)) {
      open += 1;
    }

    if (task.due_date) {
      const due = new Date(task.due_date);
      if (!isClosed(statusKey) && due < now) {
        overdue += 1;
      }
    }
  });

  return {
    total: tasks.length,
    open,
    overdue,
    statusCounts,
  };
}

function isClosed(status: string) {
  return ["done", "completed", "closed"].includes(status);
}

function formatStatus(status?: string | null) {
  if (!status) return "unknown";
  return status.replace(/_/g, " ");
}

function formatDate(value?: string | null) {
  if (!value) return "Not set";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return "Not set";
  }
}

function formatRelativeDate(value?: string | null) {
  if (!value) return "just now";
  try {
    const date = new Date(value);
    return date.toLocaleString();
  } catch {
    return "recently";
  }
}
