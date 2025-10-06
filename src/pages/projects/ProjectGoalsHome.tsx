import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useGoals } from "@/hooks/useGoals";
import { useOKRCycles } from "@/hooks/useOKRCycles";
import { supabase } from "@/integrations/supabase/client";
import type { Goal } from "@/types";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "on_track", label: "On track" },
  { value: "at_risk", label: "At risk" },
  { value: "off_track", label: "Off track" },
  { value: "paused", label: "Paused" },
  { value: "done", label: "Done" },
];

function StatusBadge({ status }: { status: Goal["status"] }) {
  const tone = {
    on_track: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-300",
    at_risk: "bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-300",
    off_track: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300",
    paused: "bg-slate-100 text-slate-800 dark:bg-slate-900/20 dark:text-slate-300",
    done: "bg-primary/10 text-primary",
    archived: "bg-muted text-muted-foreground",
  } as const;

  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${tone[status] ?? tone.on_track}`}>
      {status.replace("_", " ")}
    </span>
  );
}

export default function ProjectGoalsHome() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [cycleFilter, setCycleFilter] = useState<string | undefined>();
  const [showArchived, setShowArchived] = useState(false);

  const { data: cycles } = useOKRCycles();
  const { data: project, isLoading: loadingProject, error: projectError } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!projectId) return null;
      const { data, error } = await supabase.from("projects").select("id, name").eq("id", projectId).maybeSingle();
      if (error) throw error;
      return data as { id: string; name: string | null } | null;
    },
    enabled: Boolean(projectId),
  });

  const params = useMemo(
    () => ({
      projectId: projectId ?? undefined,
      q: search.trim() || undefined,
      status: statusFilter,
      cycleId: cycleFilter,
      includeArchived: showArchived,
    }),
    [cycleFilter, projectId, search, showArchived, statusFilter]
  );

  const { data: goals, isLoading, isError, error } = useGoals(params);

  useEffect(() => {
    if (projectId) {
      document.title = project?.name
        ? `Projects / ${project.name} / Goals`
        : `Projects / ${projectId} / Goals`;
    }
  }, [project?.name, projectId]);

  if (!projectId) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Project not found.</AlertDescription>
      </Alert>
    );
  }

  if (projectError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{(projectError as Error).message}</AlertDescription>
      </Alert>
    );
  }

  const stats = useMemo(() => {
    if (!goals || goals.length === 0) {
      return { total: 0, onTrack: 0, atRisk: 0 };
    }
    return goals.reduce(
      (acc, goal) => {
        acc.total += 1;
        if (goal.status === "on_track") acc.onTrack += 1;
        if (goal.status === "at_risk" || goal.status === "off_track") acc.atRisk += 1;
        return acc;
      },
      { total: 0, onTrack: 0, atRisk: 0 }
    );
  }, [goals]);

  const renderGoalList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="border-dashed">
              <CardContent className="flex items-center justify-between p-4">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!goals || goals.length === 0) {
      return (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center text-sm text-muted-foreground">
            <ShieldAlert className="h-6 w-6 text-primary" aria-hidden />
            <p>No goals for this project yet.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-3">
        {goals.map((goal) => (
          <Card
            key={goal.id}
            role="button"
            tabIndex={0}
            className="transition hover:border-primary"
            onClick={() => navigate(`/projects/${projectId}/goals/${goal.id}`)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                navigate(`/projects/${projectId}/goals/${goal.id}`);
              }
            }}
          >
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div className="space-y-1">
                <p className="font-medium leading-tight text-foreground">{goal.title}</p>
                {goal.description && (
                  <p className="line-clamp-2 text-sm text-muted-foreground">{goal.description}</p>
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={goal.status} />
                <span className="text-sm text-muted-foreground">{goal.progress.toFixed(0)}%</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Project goals</h1>
          <p className="text-sm text-muted-foreground">
            {loadingProject
              ? "Loading project..."
              : `Goals aligned to ${project?.name ?? `project ${projectId}`}.`}
          </p>
        </div>
        <Button onClick={() => navigate(`/projects/${projectId}/goals/new`)}>Create goal</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>On track</CardDescription>
            <CardTitle className="text-2xl">{stats.onTrack}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Needs attention</CardDescription>
            <CardTitle className="text-2xl">{stats.atRisk}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter project goals by cycle, status, or search.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 rounded-md border px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" aria-hidden />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search goals"
                className="border-0 p-0 shadow-none focus-visible:ring-0"
              />
            </div>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger aria-label="Status filter">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={cycleFilter ?? "all"} onValueChange={(value) => setCycleFilter(value === "all" ? undefined : value)}>
            <SelectTrigger aria-label="Cycle filter">
              <SelectValue placeholder="All cycles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cycles</SelectItem>
              {(cycles ?? []).map((cycle) => (
                <SelectItem key={cycle.id} value={cycle.id}>
                  {cycle.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant={showArchived ? "default" : "outline"} onClick={() => setShowArchived((value) => !value)}>
            {showArchived ? "Hide archived" : "Show archived"}
          </Button>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error)?.message ?? "Failed to load goals."}</AlertDescription>
        </Alert>
      ) : (
        renderGoalList()
      )}
    </div>
  );
}
