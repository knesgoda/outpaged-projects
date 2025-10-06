import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { DateRange, DateRangeControls } from "@/components/common/DateRangeControls";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useWorkload } from "@/hooks/useWorkload";
import { listProjects, type ProjectSummary } from "@/services/projects";
import { UNASSIGNED_KEY, type WorkloadQueryParams } from "@/services/workload";
import { WorkloadSummaryCards } from "./WorkloadSummaryCards";
import { WorkloadTable } from "./WorkloadTable";
import { WorkloadHeatmap, type HeatmapDay, type HeatmapRow } from "./WorkloadHeatmap";
import { WorkloadTaskDrawer } from "./WorkloadTaskDrawer";

function getThisWeekRange(): DateRange {
  const today = new Date();
  return {
    from: startOfWeek(today, { weekStartsOn: 1 }),
    to: endOfWeek(today, { weekStartsOn: 1 }),
  };
}

function toDateKey(value?: string | null) {
  if (!value) return undefined;
  const parsed = parseISO(value);
  if (Number.isNaN(parsed.getTime())) {
    const fallback = new Date(value);
    if (Number.isNaN(fallback.getTime())) {
      return undefined;
    }
    return format(fallback, "yyyy-MM-dd");
  }
  return format(parsed, "yyyy-MM-dd");
}

type WorkloadDashboardProps = {
  initialProjectId?: string;
  allowProjectSelection?: boolean;
  lockedProjectName?: string;
};

export function WorkloadDashboard({
  initialProjectId,
  allowProjectSelection = true,
  lockedProjectName,
}: WorkloadDashboardProps) {
  const [range, setRange] = useState<DateRange>(getThisWeekRange());
  const [statusFilter, setStatusFilter] = useState<"open" | "all">("open");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [includeTime, setIncludeTime] = useState(false);
  const [projectId, setProjectId] = useState<string | undefined>(initialProjectId);
  const [selectedAssigneeKey, setSelectedAssigneeKey] = useState<string | null>(null);
  const [isDrawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!allowProjectSelection) {
      setProjectId(initialProjectId);
    }
  }, [allowProjectSelection, initialProjectId]);

  useEffect(() => {
    setSelectedAssigneeKey(null);
    setDrawerOpen(false);
  }, [projectId]);

  const dateFrom = useMemo(() => format(range.from, "yyyy-MM-dd"), [range.from]);
  const dateTo = useMemo(() => format(range.to, "yyyy-MM-dd"), [range.to]);

  const workloadParams = useMemo<WorkloadQueryParams>(() => ({
    projectId,
    dateFrom,
    dateTo,
    includeTime,
    statusFilter,
  }), [projectId, dateFrom, dateTo, includeTime, statusFilter]);

  const { summary, tasks, tasksByAssignee, hasEstimates, isLoading, isError, refetch } = useWorkload(workloadParams);

  const projectsQuery = useQuery<ProjectSummary[]>({
    queryKey: ["projects", "workload"],
    queryFn: listProjects,
    staleTime: 1000 * 60 * 5,
    enabled: allowProjectSelection,
  });

  const assigneeMeta = useMemo(() => {
    const map = new Map<string, { name: string; avatarUrl?: string | null }>();

    tasks.forEach((task) => {
      const key = task.assignee_id ?? UNASSIGNED_KEY;
      const name =
        task.assignee_name ?? (task.assignee_id ? "Unknown teammate" : "Unassigned");
      if (!map.has(key)) {
        map.set(key, { name, avatarUrl: task.assignee_avatar_url });
      } else {
        const entry = map.get(key)!;
        if (!entry.avatarUrl && task.assignee_avatar_url) {
          entry.avatarUrl = task.assignee_avatar_url;
        }
      }
    });

    summary.forEach((row) => {
      const key = row.assignee ?? UNASSIGNED_KEY;
      if (!map.has(key)) {
        map.set(key, {
          name: row.assignee_name ?? (row.assignee ? "Unknown teammate" : "Unassigned"),
        });
      }
    });

    return map;
  }, [summary, tasks]);

  const filteredRows = useMemo(() => {
    const normalizedQuery = assigneeQuery.trim().toLowerCase();
    return summary.filter((row) => {
      const key = row.assignee ?? UNASSIGNED_KEY;
      if (selectedAssigneeKey && key !== selectedAssigneeKey) {
        return false;
      }
      if (!normalizedQuery) {
        return true;
      }
      const name = assigneeMeta.get(key)?.name ?? row.assignee_name ?? "Unassigned";
      return name.toLowerCase().includes(normalizedQuery);
    });
  }, [summary, assigneeMeta, assigneeQuery, selectedAssigneeKey]);

  const heatmapDays = useMemo<HeatmapDay[]>(() => {
    return eachDayOfInterval({ start: range.from, end: range.to }).map((date) => ({
      key: format(date, "yyyy-MM-dd"),
      label: format(date, "MMM d, yyyy"),
      shortLabel: format(date, "EEE"),
    }));
  }, [range.from, range.to]);

  const heatmapRows = useMemo<HeatmapRow[]>(() => {
    if (heatmapDays.length === 0) return [];
    const dayKeys = new Set(heatmapDays.map((day) => day.key));
    const map = new Map<string, HeatmapRow>();

    tasks.forEach((task) => {
      const key = task.assignee_id ?? UNASSIGNED_KEY;
      const baseName = assigneeMeta.get(key)?.name ?? task.assignee_name ?? (task.assignee_id ? "Unknown teammate" : "Unassigned");
      if (!map.has(key)) {
        map.set(key, { assigneeKey: key, assigneeName: baseName, values: {} });
      }

      const preferredDateKey = toDateKey(task.due_date) ?? toDateKey(task.created_at);
      if (!preferredDateKey || !dayKeys.has(preferredDateKey)) {
        return;
      }

      const entry = map.get(key)!;
      entry.values[preferredDateKey] = (entry.values[preferredDateKey] ?? 0) + task.estimate_minutes;
    });

    const rows: HeatmapRow[] = Array.from(map.values());
    rows.sort((a, b) => a.assigneeName.localeCompare(b.assigneeName));
    return rows;
  }, [assigneeMeta, heatmapDays, tasks]);

  const totalOpen = useMemo(
    () => summary.reduce((acc, row) => acc + row.open_tasks, 0),
    [summary]
  );
  const totalOverdue = useMemo(
    () => summary.reduce((acc, row) => acc + row.overdue_tasks, 0),
    [summary]
  );
  const totalEstimateMinutes = useMemo(
    () => summary.reduce((acc, row) => acc + (row.estimate_minutes_total ?? 0), 0),
    [summary]
  );
  const totalLoggedMinutes = useMemo(
    () => summary.reduce((acc, row) => acc + (row.logged_minutes_total ?? 0), 0),
    [summary]
  );

  const selectedTasks = selectedAssigneeKey ? tasksByAssignee.get(selectedAssigneeKey) ?? [] : [];
  const selectedAssigneeName = selectedAssigneeKey
    ? assigneeMeta.get(selectedAssigneeKey)?.name ?? "Unassigned"
    : "";

  const handleSelectAssignee = useCallback(
    (assignee: string | null) => {
      const key = assignee ?? UNASSIGNED_KEY;
      setSelectedAssigneeKey(key);
      setDrawerOpen(true);
    },
    []
  );

  const clearSelection = useCallback(() => {
    setSelectedAssigneeKey(null);
    setDrawerOpen(false);
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-lg border bg-background p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <Label htmlFor="workload-date-range">Date range</Label>
            <DateRangeControls
              unit="week"
              range={range}
              onChange={setRange}
              className="flex-wrap"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            {allowProjectSelection ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="workload-project">Project</Label>
                <Select
                  value={projectId ?? "all"}
                  onValueChange={(value) => setProjectId(value === "all" ? undefined : value)}
                  disabled={projectsQuery.isLoading}
                >
                  <SelectTrigger id="workload-project" className="min-w-[200px]">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {(projectsQuery.data ?? []).map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="flex flex-col gap-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">Project</span>
                <span>{lockedProjectName ?? "Selected project"}</span>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="workload-status">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(value: "open" | "all") => setStatusFilter(value)}
              >
                <SelectTrigger id="workload-status" className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open only</SelectItem>
                  <SelectItem value="all">All tasks</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="workload-assignee">Assignee</Label>
              <Input
                id="workload-assignee"
                placeholder="Search people"
                value={assigneeQuery}
                onChange={(event) => setAssigneeQuery(event.target.value)}
                className="w-full min-w-[200px]"
              />
            </div>
            <div className="flex items-center gap-3 rounded-md border px-3 py-2">
              <div className="space-y-1">
                <Label htmlFor="workload-include-time">Include time</Label>
                <p className="text-xs text-muted-foreground">Show logged hours</p>
              </div>
              <Switch
                id="workload-include-time"
                checked={includeTime}
                onCheckedChange={setIncludeTime}
              />
            </div>
          </div>
        </div>
        {selectedAssigneeKey && (
          <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm">
            <span>
              Filtering by {assigneeMeta.get(selectedAssigneeKey)?.name ?? "Unassigned"}
            </span>
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              Clear
            </Button>
          </div>
        )}
      </div>

      {isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load workload</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>Check your connection and try again.</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!isLoading && !isError && summary.length > 0 && !hasEstimates && (
        <Alert>
          <AlertTitle>Add estimates to improve accuracy</AlertTitle>
          <AlertDescription>
            None of the tasks in this range have estimates yet. Add time estimates to see capacity insights.
          </AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full" />
          ))}
        </div>
      ) : (
        <WorkloadSummaryCards
          dateFrom={range.from}
          dateTo={range.to}
          totalOpen={totalOpen}
          totalOverdue={totalOverdue}
          totalEstimateMinutes={totalEstimateMinutes}
          totalLoggedMinutes={includeTime ? totalLoggedMinutes : 0}
          includeTime={includeTime}
        />
      )}

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <WorkloadTable
          rows={filteredRows}
          includeTime={includeTime}
          assigneeMeta={assigneeMeta}
          onSelectAssignee={handleSelectAssignee}
          activeAssigneeKey={selectedAssigneeKey}
        />
      )}

      {!isLoading && heatmapRows.length > 0 && (
        <WorkloadHeatmap days={heatmapDays} rows={heatmapRows} />
      )}

      <WorkloadTaskDrawer
        open={isDrawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedAssigneeKey(null);
          }
        }}
        assigneeName={selectedAssigneeName || "Assignee"}
        tasks={selectedTasks}
      />
    </div>
  );
}
