import { useCallback, useMemo } from "react";
import type { ComponentType, SVGProps } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  addDays,
  differenceInDays,
  format,
  formatDistanceToNow,
  isAfter,
  isBefore,
  parseISO,
} from "date-fns";
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  BarChart3,
  BookOpen,
  CalendarClock,
  Flag,
  Folder,
  GitBranch,
  Inbox,
  LayoutDashboard,
  LayoutList,
  ListTodo,
  Plus,
  Settings,
  Sparkles,
  Timer,
} from "lucide-react";

import { Helmet } from "react-helmet-async";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  ProjectStatus,
  useArchiveProject,
  useDeleteProject,
  useProject,
  useUpdateProject,
} from "@/hooks/useProjects";
import { useProjectGovernance } from "@/hooks/useProjectGovernance";
import { useToast } from "@/hooks/use-toast";
import { useDocsList } from "@/hooks/useDocs";
import { formatProjectStatus, getProjectStatusBadgeVariant } from "@/utils/project-status";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ProjectDetailPageProps {
  tab?: string;
}

interface ProjectTab {
  value: string;
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  description: string;
}

const tabs: ProjectTab[] = [
  { value: "overview", label: "Overview", icon: LayoutList, description: "High-level health snapshot." },
  { value: "list", label: "List", icon: ListTodo, description: "Interactive table of every item." },
  { value: "board", label: "Board", icon: LayoutDashboard, description: "Kanban flow with WIP awareness." },
  { value: "backlog", label: "Backlog", icon: Inbox, description: "Rank and triage intake." },
  { value: "sprints", label: "Sprints", icon: Flag, description: "Plan and run iterations." },
  { value: "calendar", label: "Calendar", icon: CalendarClock, description: "Dates and upcoming milestones." },
  { value: "timeline", label: "Timeline", icon: GitBranch, description: "Scheduling and dependency view." },
  { value: "dependencies", label: "Dependencies", icon: AlertTriangle, description: "Cross-project blockers." },
  { value: "reports", label: "Reports", icon: BarChart3, description: "Velocity, throughput, and risk." },
  { value: "docs", label: "Docs", icon: BookOpen, description: "Knowledge captured inside the project." },
  { value: "files", label: "Files", icon: Folder, description: "Shared assets and approvals." },
  { value: "automations", label: Sparkles, description: "Recipes that keep the project humming." },
  { value: "settings", label: "Settings", icon: Settings, description: "Governance, roles, and modules." },
];

const statusCategory: Record<string, "todo" | "inProgress" | "done"> = {
  todo: "todo",
  planned: "todo",
  backlog: "todo",
  "to do": "todo",
  ready: "todo",
  "in_progress": "inProgress",
  doing: "inProgress",
  blocked: "inProgress",
  review: "inProgress",
  qa: "inProgress",
  done: "done",
  completed: "done",
  shipped: "done",
};

interface TaskSnapshot {
  id: string;
  title: string | null;
  status: string | null;
  priority: string | null;
  due_date: string | null;
  start_date: string | null;
  end_date: string | null;
  sprint_id: string | null;
  updated_at: string | null;
  team_assigned: string | null;
  story_points: number | null;
  blocked: boolean | null;
  blocking_reason: string | null;
}

interface SprintRecord {
  id: string;
  name: string;
  status: string | null;
  start_date: string | null;
  end_date: string | null;
  description: string | null;
}

interface AutomationSummary {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  last_executed_at: string | null;
  execution_count: number;
}

interface TaskDependencyRecord {
  id: string;
  source_task_id: string;
  target_task_id: string;
  relationship_type: string | null;
  lag_days: number | null;
}

const priorityRank: Record<string, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const DEFAULT_PRIORITY_WEIGHT = 4;

function sortByPriority(left: string | null, right: string | null) {
  const leftRank = left ? priorityRank[left.toLowerCase()] ?? DEFAULT_PRIORITY_WEIGHT : DEFAULT_PRIORITY_WEIGHT;
  const rightRank = right ? priorityRank[right.toLowerCase()] ?? DEFAULT_PRIORITY_WEIGHT : DEFAULT_PRIORITY_WEIGHT;
  return leftRank - rightRank;
}

function formatDate(value?: string | null, fallback = "—") {
  if (!value) return fallback;
  try {
    return format(parseISO(value), "PP");
  } catch (error) {
    console.error("Failed to format date", error);
    return fallback;
  }
}

function buildTaskSummary(tasks: TaskSnapshot[]) {
  const now = Date.now();
  const byStatus = tasks.reduce(
    (acc, task) => {
      const status = task.status?.toLowerCase() ?? "todo";
      const category = statusCategory[status] ?? "todo";
      acc[category] += 1;
      return acc;
    },
    { todo: 0, inProgress: 0, done: 0 },
  );

  const total = tasks.length;
  const overdue = tasks.filter(task => {
    if (!task.due_date) return false;
    try {
      return parseISO(task.due_date).getTime() < now && (task.status ?? "").toLowerCase() !== "done";
    } catch {
      return false;
    }
  }).length;

  const blocked = tasks.filter(task => task.blocked).length;
  const upcoming = tasks.filter(task => {
    if (!task.due_date) return false;
    try {
      const due = parseISO(task.due_date);
      return isAfter(due, new Date()) && isBefore(due, addDays(new Date(), 14));
    } catch {
      return false;
    }
  }).length;

  const storyPoints = tasks.reduce(
    (acc, task) => {
      if (typeof task.story_points === "number" && !Number.isNaN(task.story_points)) {
        acc.total += task.story_points;
        if ((task.status ?? "").toLowerCase() === "done") {
          acc.completed += task.story_points;
        }
      }
      return acc;
    },
    { total: 0, completed: 0 },
  );

  const completion = total > 0 ? Math.round((byStatus.done / total) * 100) : 0;
  const pointCompletion = storyPoints.total > 0 ? Math.round((storyPoints.completed / storyPoints.total) * 100) : null;

  return {
    total,
    overdue,
    blocked,
    upcoming,
    completion,
    pointCompletion,
    byStatus,
  };
}

function findNextMilestone(tasks: TaskSnapshot[], sprints: SprintRecord[]) {
  const futureSprints = sprints
    .filter(sprint => sprint.end_date && isAfter(parseISO(sprint.end_date), new Date()))
    .sort((left, right) => {
      if (!left.end_date || !right.end_date) return 0;
      return parseISO(left.end_date).getTime() - parseISO(right.end_date).getTime();
    });
  if (futureSprints.length > 0) {
    const sprint = futureSprints[0];
    return {
      label: sprint.name,
      date: sprint.end_date,
      description: sprint.description ?? "Sprint end",
    };
  }

  const futureTasks = tasks
    .filter(task => task.due_date)
    .sort((left, right) => {
      if (!left.due_date || !right.due_date) return 0;
      return parseISO(left.due_date).getTime() - parseISO(right.due_date).getTime();
    });

  if (futureTasks.length > 0) {
    const task = futureTasks[0];
    return {
      label: task.title ?? "Upcoming deliverable",
      date: task.due_date,
      description: "Next due item",
    };
  }

  return null;
}

function computeTeamBreakdown(tasks: TaskSnapshot[]) {
  const map = new Map<string, { count: number; overdue: number }>();
  for (const task of tasks) {
    const team = task.team_assigned?.trim() || "Unassigned";
    const entry = map.get(team) ?? { count: 0, overdue: 0 };
    entry.count += 1;
    if (task.due_date) {
      try {
        const due = parseISO(task.due_date);
        if (isBefore(due, new Date()) && (task.status ?? "").toLowerCase() !== "done") {
          entry.overdue += 1;
        }
      } catch {
        // ignore parsing errors
      }
    }
    map.set(team, entry);
  }
  return Array.from(map.entries())
    .map(([team, data]) => ({ team, ...data }))
    .sort((left, right) => right.count - left.count);
}

function computeCalendar(tasks: TaskSnapshot[]) {
  const groups = new Map<string, TaskSnapshot[]>();
  for (const task of tasks) {
    if (!task.due_date) continue;
    const key = format(parseISO(task.due_date), "yyyy-ww");
    const existing = groups.get(key) ?? [];
    existing.push(task);
    groups.set(key, existing);
  }
  return Array.from(groups.entries())
    .map(([key, entries]) => {
      const sample = entries[0];
      const weekStart = format(parseISO(sample.due_date!), "PP");
      return {
        key,
        weekStart,
        entries: entries.sort((left, right) => {
          if (!left.due_date || !right.due_date) return 0;
          return parseISO(left.due_date).getTime() - parseISO(right.due_date).getTime();
        }),
      };
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

function computeTimeline(tasks: TaskSnapshot[]) {
  return tasks
    .filter(task => task.start_date || task.end_date || task.due_date)
    .map(task => {
      const start = task.start_date ?? task.due_date ?? task.end_date;
      const end = task.end_date ?? task.due_date ?? task.start_date;
      return {
        ...task,
        start,
        end,
      };
    })
    .filter(task => task.start || task.end)
    .sort((left, right) => {
      if (!left.start || !right.start) return 0;
      return parseISO(left.start).getTime() - parseISO(right.start).getTime();
    });
}

function formatRelative(value?: string | null) {
  if (!value) return "—";
  try {
    return formatDistanceToNow(parseISO(value), { addSuffix: true });
  } catch {
    return "—";
  }
}

function getHealthColor(projectStatus: ProjectStatus | undefined, summary: ReturnType<typeof buildTaskSummary>) {
  if (projectStatus === "on_hold" || projectStatus === "cancelled") {
    return { badge: "outline" as const, label: formatProjectStatus(projectStatus) };
  }

  if (summary.blocked > 0 || summary.overdue > summary.total * 0.2) {
    return { badge: "destructive" as const, label: "At risk" };
  }

  if (summary.overdue > 0 || summary.upcoming > summary.total * 0.2) {
    return { badge: "warning" as const, label: "Watch" };
  }

  if (summary.byStatus.done === summary.total && summary.total > 0) {
    return { badge: "success" as const, label: "Delivered" };
  }

  return { badge: "default" as const, label: "Healthy" };
}

export function ProjectDetailPage({ tab = "overview" }: ProjectDetailPageProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const activeTab = tabs.some(entry => entry.value === tab) ? tab : "overview";

  const { data: project, isLoading, isError, error, refetch } = useProject(projectId);
  const archiveMutation = useArchiveProject();
  const updateMutation = useUpdateProject();
  const deleteMutation = useDeleteProject();

  const isOwner = true; // TODO: integrate real role checks when membership service is complete.
  const governance = useProjectGovernance(projectId);
  const {
    canManageSettings,
    canManageAutomations,
    canManageLifecycle,
    canCreateItems,
    canDeleteProject,
  } = governance.permissions;
  const currentTab = tabs.find(entry => entry.value === activeTab) ?? tabs[0];
  const projectLabel = project?.name ?? projectId ?? "Project";
  const pageTitle = `Projects - ${projectLabel} - ${currentTab.label}`;

  const tasksQuery = useQuery<TaskSnapshot[]>({
    queryKey: ["project", projectId, "tasks"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error: queryError } = await supabase
        .from("tasks")
        .select(
          "id, title, status, priority, due_date, start_date, end_date, sprint_id, updated_at, team_assigned, story_points, blocked, blocking_reason",
        )
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false })
        .limit(500);

      if (queryError) {
        throw queryError;
      }

      return (data as TaskSnapshot[]) ?? [];
    },
    staleTime: 1000 * 30,
  });

  const sprintsQuery = useQuery<SprintRecord[]>({
    queryKey: ["project", projectId, "sprints"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error: queryError } = await supabase
        .from("sprints")
        .select("id, name, status, start_date, end_date, description")
        .eq("project_id", projectId)
        .order("start_date", { ascending: true });

      if (queryError) {
        throw queryError;
      }

      return (data as SprintRecord[]) ?? [];
    },
  });

  const automationsQuery = useQuery<AutomationSummary[]>({
    queryKey: ["project", projectId, "automations"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error: queryError } = await supabase
        .from("automation_rules")
        .select("id, name, description, is_active, last_executed_at, execution_count")
        .eq("project_id", projectId)
        .order("updated_at", { ascending: false });

      if (queryError) {
        throw queryError;
      }

      return (data as AutomationSummary[]) ?? [];
    },
  });

  const dependenciesQuery = useQuery<TaskDependencyRecord[]>({
    queryKey: ["project", projectId, "dependencies"],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      const { data, error: queryError } = await supabase
        .from("task_dependencies")
        .select("id, source_task_id, target_task_id, relationship_type, lag_days")
        .eq("project_id", projectId);

      if (queryError) {
        throw queryError;
      }

      return (data as TaskDependencyRecord[]) ?? [];
    },
  });

  const docsQuery = useDocsList({ projectId: projectId ?? undefined, enabled: Boolean(projectId) });

  const tasks = useMemo(() => tasksQuery.data ?? [], [tasksQuery.data]);
  const sprints = useMemo(() => sprintsQuery.data ?? [], [sprintsQuery.data]);
  const automations = useMemo(() => automationsQuery.data ?? [], [automationsQuery.data]);
  const dependencies = useMemo(() => dependenciesQuery.data ?? [], [dependenciesQuery.data]);
  const docs = useMemo(() => docsQuery.data ?? [], [docsQuery.data]);

  const summary = useMemo(() => buildTaskSummary(tasks), [tasks]);
  const teamBreakdown = useMemo(() => computeTeamBreakdown(tasks), [tasks]);
  const milestone = useMemo(() => findNextMilestone(tasks, sprints), [tasks, sprints]);
  const calendarWeeks = useMemo(() => computeCalendar(tasks), [tasks]);
  const timeline = useMemo(() => computeTimeline(tasks), [tasks]);

  const renderBreadcrumbForState = (
    finalLabel: string,
    options: { linkProject?: boolean; hideProject?: boolean } = {},
  ) => (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/projects">Projects</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {options.hideProject || !projectId ? null : (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {options.linkProject ? (
                <BreadcrumbLink asChild>
                  <Link to={`/projects/${projectId}`}>{projectLabel}</Link>
                </BreadcrumbLink>
              ) : (
                <BreadcrumbPage>{projectLabel}</BreadcrumbPage>
              )}
            </BreadcrumbItem>
          </>
        )}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{finalLabel}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );

  const handleNavigateToTab = useCallback(
    (nextTab: string) => {
      if (!projectId) return;
      const base = `/projects/${projectId}`;
      const path = nextTab === "overview" ? base : `${base}/${nextTab}`;
      if (location.pathname !== path) {
        navigate(path);
      }
    },
    [location.pathname, navigate, projectId],
  );

  const handleArchive = useCallback(async () => {
    if (!projectId) return;
    if (!canManageLifecycle) {
      toast({
        title: "Not allowed",
        description: "You do not have permission to manage the project lifecycle.",
        variant: "destructive",
      });
      return;
    }
    try {
      if (project?.status === "archived") {
        await updateMutation.mutateAsync({ id: projectId, patch: { status: "active" } });
        toast({ title: "Project restored" });
      } else {
        await archiveMutation.mutateAsync({ id: projectId });
        toast({ title: "Project archived" });
      }
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Action failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [archiveMutation, canManageLifecycle, project?.status, projectId, toast, updateMutation]);

  const handleDelete = useCallback(async () => {
    if (!projectId) return;
    if (!canDeleteProject) {
      toast({
        title: "Not allowed",
        description: "You do not have permission to delete this project.",
        variant: "destructive",
      });
      return;
    }
    const confirmDelete = window.confirm("Delete this project? This cannot be undone.");
    if (!confirmDelete) {
      return;
    }

    try {
      await deleteMutation.mutateAsync({ id: projectId });
      toast({ title: "Project deleted" });
      navigate("/projects");
    } catch (exception) {
      console.error(exception);
      toast({
        title: "Could not delete",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  }, [canDeleteProject, deleteMutation, navigate, projectId, toast]);

  const headerContent = useMemo(() => {
    if (!project) {
      return null;
    }

    const updatedDate = project.updated_at ? new Date(project.updated_at) : null;
    const isValidDate = updatedDate && !Number.isNaN(updatedDate.getTime());
    const lastUpdatedLabel = isValidDate
      ? formatDistanceToNow(updatedDate, { addSuffix: true })
      : "Unknown";

    const health = getHealthColor(project.status, summary);

    return (
      <div className="flex flex-col gap-6 rounded-lg border bg-background/80 p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
              <Badge variant={getProjectStatusBadgeVariant(project.status)}>
                {formatProjectStatus(project.status)}
              </Badge>
              <Badge variant={health.badge}>{health.label}</Badge>
            </div>
            {project.description ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Project key: {project.code ?? "—"}</span>
              <span>Updated {lastUpdatedLabel}</span>
              <span>Items: {summary.total}</span>
              <span>Open: {summary.total - summary.byStatus.done}</span>
              <span>Blocked: {summary.blocked}</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/settings`)}
              disabled={!projectId || !canManageSettings}
            >
              <Settings className="mr-2 h-4 w-4" />
              Edit settings
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/automations`)}
              disabled={!canManageAutomations}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Automations
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/sprints`)}
              disabled={!canManageLifecycle}
            >
              <Timer className="mr-2 h-4 w-4" />
              Plan sprint
            </Button>
            <Button onClick={() => navigate(`/tasks?projectId=${projectId ?? ""}`)} disabled={!canCreateItems}>
              <Plus className="mr-2 h-4 w-4" />
              New item
            </Button>
            <Button
              variant="outline"
              onClick={handleArchive}
              disabled={!canManageLifecycle || archiveMutation.isPending || updateMutation.isPending}
            >
              {project.status === "archived" ? (
                <>
                  <ArchiveRestore className="mr-2 h-4 w-4" />
                  Unarchive
                </>
              ) : (
                <>
                  <Archive className="mr-2 h-4 w-4" />
                  Archive
                </>
              )}
            </Button>
            {canDeleteProject ? (
              <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                Delete
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span>{summary.byStatus.done} done</span>
                <span>{summary.total} total</span>
              </div>
              <Progress value={summary.completion} className="h-2" />
              <p className="text-xs text-muted-foreground">{summary.completion}% complete</p>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {milestone ? (
                <>
                  <div className="text-sm font-medium">{milestone.label}</div>
                  <p className="text-xs text-muted-foreground">
                    {milestone.description} · {formatDate(milestone.date)} ({formatRelative(milestone.date)})
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">No upcoming milestones detected.</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary.blocked}</p>
              <p className="text-xs text-muted-foreground">Items needing attention</p>
            </CardContent>
          </Card>
          <Card className="border-dashed">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Story points</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">
                {summary.pointCompletion === null ? "—" : `${summary.pointCompletion}%`}
              </p>
              <p className="text-xs text-muted-foreground">Completed vs planned</p>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }, [
    archiveMutation.isPending,
    canCreateItems,
    canDeleteProject,
    canManageAutomations,
    canManageLifecycle,
    canManageSettings,
    deleteMutation.isPending,
    handleArchive,
    handleDelete,
    navigate,
    project,
    projectId,
    summary,
    updateMutation.isPending,
    milestone,
  ]);

  if (!projectId) {
    const title = "Projects - Not found";
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState("Not found", { hideProject: true })}
        <Alert>
          <AlertTitle>Project not found</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>The requested project is missing.</span>
            <Button variant="outline" onClick={() => navigate("/projects")}>Go to projects</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    const title = projectId ? `Projects - ${projectId}` : "Projects";
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState(currentTab.label)}
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isError) {
    const title = `Projects - ${projectLabel} - Error`;
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState("Error", { linkProject: Boolean(projectId) })}
        <Alert variant="destructive">
          <AlertTitle>We hit a snag</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>{error instanceof Error ? error.message : "The project failed to load."}</span>
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!project) {
    const title = "Projects - Not found";
    return (
      <div className="space-y-6 p-6">
        <Helmet>
          <title>{title}</title>
        </Helmet>
        {renderBreadcrumbForState("Not found", { linkProject: Boolean(projectId) })}
        <Alert>
          <AlertTitle>Project not found</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>This project does not exist.</span>
            <Button variant="outline" onClick={() => navigate("/projects")}>Go to projects</Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const content = renderTabContent({
    activeTab,
    tasks,
    tasksQuery,
    summary,
    sprints,
    automations,
    docs,
    dependencies,
    calendarWeeks,
    timeline,
    teamBreakdown,
    project,
  });

  const recentActivities = tasks.slice(0, 6);

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      {renderBreadcrumbForState(currentTab.label, { linkProject: true })}
      {headerContent}

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)_320px]">
        <nav className="hidden lg:block">
          <Card className="h-full border bg-background">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Project modules</CardTitle>
              <CardDescription className="text-xs">Switch between work surfaces.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {tabs.map(entry => {
                const isActive = entry.value === activeTab;
                return (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => handleNavigateToTab(entry.value)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition",
                      isActive
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-muted"
                    )}
                  >
                    <entry.icon className="h-4 w-4" />
                    <div>
                      <div className="font-medium leading-tight">{entry.label}</div>
                      <p className="text-xs text-muted-foreground leading-tight">{entry.description}</p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </nav>

        <div className="space-y-6">
          <Card>
            <CardHeader className="space-y-1">
              <CardTitle>{currentTab.label}</CardTitle>
              <CardDescription>{currentTab.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">{content}</CardContent>
          </Card>
        </div>

        <aside className="hidden space-y-6 xl:block">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
              <CardDescription className="text-xs">Latest work item updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tasksQuery.isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full" />
                  ))}
                </div>
              ) : recentActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground">No recent changes yet.</p>
              ) : (
                recentActivities.map(task => (
                  <div key={task.id} className="space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{task.title ?? "Untitled item"}</p>
                      <Badge variant="outline" className="text-[11px] capitalize">
                        {(task.status ?? "todo").replaceAll("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Updated {formatRelative(task.updated_at)} · Due {formatDate(task.due_date)}
                    </p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Teams & load</CardTitle>
              <CardDescription className="text-xs">Distribution by team assignment.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team assignments recorded.</p>
              ) : (
                teamBreakdown.map(entry => (
                  <div key={entry.team} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span>{entry.team}</span>
                      <span>{entry.count}</span>
                    </div>
                    <Progress value={Math.min(100, (entry.overdue / Math.max(entry.count, 1)) * 100)} className="h-2" />
                    <p className="text-[11px] text-muted-foreground">{entry.overdue} overdue</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

type RenderContext = {
  activeTab: string;
  tasks: TaskSnapshot[];
  tasksQuery: UseQueryResult<TaskSnapshot[]>;
  summary: ReturnType<typeof buildTaskSummary>;
  sprints: SprintRecord[];
  automations: AutomationSummary[];
  docs: any[];
  dependencies: TaskDependencyRecord[];
  calendarWeeks: ReturnType<typeof computeCalendar>;
  timeline: ReturnType<typeof computeTimeline>;
  teamBreakdown: ReturnType<typeof computeTeamBreakdown>;
  project: { modules: string[] | null; lifecycle: any } & Record<string, unknown>;
};

function renderTabContent(context: RenderContext) {
  switch (context.activeTab) {
    case "overview":
      return <OverviewTab {...context} />;
    case "list":
      return <ListTab {...context} />;
    case "board":
      return <BoardTab {...context} />;
    case "backlog":
      return <BacklogTab {...context} />;
    case "sprints":
      return <SprintsTab {...context} />;
    case "calendar":
      return <CalendarTab {...context} />;
    case "timeline":
      return <TimelineTab {...context} />;
    case "dependencies":
      return <DependenciesTab {...context} />;
    case "reports":
      return <ReportsTab {...context} />;
    case "docs":
      return <DocsTab {...context} />;
    case "files":
      return <FilesTab {...context} />;
    case "automations":
      return <AutomationsTab {...context} />;
    case "settings":
      return <SettingsTab {...context} />;
    default:
      return <OverviewTab {...context} />;
  }
}

function OverviewTab({ summary, tasks }: RenderContext) {
  const recentBlocked = tasks.filter(task => task.blocked).slice(0, 5);
  const upcoming = tasks
    .filter(task => task.due_date && isAfter(parseISO(task.due_date), new Date()))
    .sort((left, right) => {
      if (!left.due_date || !right.due_date) return 0;
      return parseISO(left.due_date).getTime() - parseISO(right.due_date).getTime();
    })
    .slice(0, 5);

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Status</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricTile label="To do" value={summary.byStatus.todo} tone="muted" />
            <MetricTile label="In progress" value={summary.byStatus.inProgress} tone="warning" />
            <MetricTile label="Done" value={summary.byStatus.done} tone="success" />
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Blocked items</h2>
          {recentBlocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">No blockers on record.</p>
          ) : (
            <div className="space-y-3">
              {recentBlocked.map(task => (
                <div key={task.id} className="rounded-md border border-destructive/40 bg-destructive/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{task.title ?? "Untitled item"}</p>
                    <Badge variant="destructive" className="uppercase">{(task.priority ?? "").slice(0, 1)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.blocking_reason ?? "No reason provided."}</p>
                  <p className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="space-y-6">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Upcoming deadlines</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No due dates in the next two weeks.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map(task => (
                <div key={task.id} className="rounded-md border bg-muted/30 p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{task.title ?? "Untitled"}</span>
                    <Badge variant="outline">{formatDate(task.due_date)}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{task.priority ?? "Medium"} priority</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function ListTab({ tasks, tasksQuery }: RenderContext) {
  if (tasksQuery.isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">No work items found for this project.</p>;
  }

  return (
    <ScrollArea className="max-h-[520px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Updated</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map(task => (
            <TableRow key={task.id}>
              <TableCell className="font-medium">{task.title ?? "Untitled"}</TableCell>
              <TableCell className="capitalize">{task.status ?? "todo"}</TableCell>
              <TableCell className="capitalize">{task.priority ?? "—"}</TableCell>
              <TableCell>{formatDate(task.due_date)}</TableCell>
              <TableCell>{formatRelative(task.updated_at)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableCaption className="text-xs text-muted-foreground">
          Showing {tasks.length} items (max 500).
        </TableCaption>
      </Table>
    </ScrollArea>
  );
}

function BoardTab({ tasks }: RenderContext) {
  const columns = useMemo(() => {
    const map: Record<string, TaskSnapshot[]> = {};
    for (const task of tasks) {
      const status = (task.status ?? "todo").toLowerCase();
      if (!map[status]) {
        map[status] = [];
      }
      map[status].push(task);
    }
    return Object.entries(map)
      .map(([status, entries]) => ({
        status,
        entries: entries.sort((left, right) => sortByPriority(left.priority, right.priority)),
      }))
      .sort((left, right) => {
        const leftRank = statusCategory[left.status] === "todo" ? 0 : statusCategory[left.status] === "inProgress" ? 1 : 2;
        const rightRank = statusCategory[right.status] === "todo" ? 0 : statusCategory[right.status] === "inProgress" ? 1 : 2;
        if (leftRank === rightRank) {
          return left.status.localeCompare(right.status);
        }
        return leftRank - rightRank;
      });
  }, [tasks]);

  if (columns.length === 0) {
    return <p className="text-sm text-muted-foreground">No items to visualize in the board yet.</p>;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {columns.map(column => (
        <div key={column.status} className="space-y-3 rounded-lg border bg-muted/20 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold capitalize">{column.status.replaceAll("_", " ")}</h3>
            <Badge variant="outline">{column.entries.length}</Badge>
          </div>
          <div className="space-y-3">
            {column.entries.slice(0, 6).map(task => (
              <div key={task.id} className="rounded-md border bg-background p-3 shadow-sm">
                <p className="text-sm font-medium">{task.title ?? "Untitled"}</p>
                <p className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</p>
                {task.blocked ? (
                  <p className="text-xs text-destructive">Blocked: {task.blocking_reason ?? "Unknown"}</p>
                ) : null}
              </div>
            ))}
            {column.entries.length > 6 ? (
              <p className="text-xs text-muted-foreground">+{column.entries.length - 6} more</p>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function BacklogTab({ tasks }: RenderContext) {
  const sorted = [...tasks]
    .sort((left, right) => {
      const prioritySort = sortByPriority(left.priority, right.priority);
      if (prioritySort !== 0) return prioritySort;
      const leftDue = left.due_date ? parseISO(left.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      const rightDue = right.due_date ? parseISO(right.due_date).getTime() : Number.MAX_SAFE_INTEGER;
      return leftDue - rightDue;
    })
    .slice(0, 20);

  if (sorted.length === 0) {
    return <p className="text-sm text-muted-foreground">The backlog is empty.</p>;
  }

  return (
    <div className="space-y-3">
      {sorted.map(task => (
        <div key={task.id} className="flex flex-col gap-2 rounded-md border bg-muted/20 p-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-medium">{task.title ?? "Untitled"}</p>
            <p className="text-xs text-muted-foreground">Priority: {task.priority ?? "Medium"}</p>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>Due {formatDate(task.due_date)}</span>
            <span>Updated {formatRelative(task.updated_at)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function SprintsTab({ sprints, tasks }: RenderContext) {
  if (sprints.length === 0) {
    return <p className="text-sm text-muted-foreground">No sprints have been scheduled yet.</p>;
  }

  return (
    <div className="space-y-4">
      {sprints.map(sprint => {
        const sprintTasks = tasks.filter(task => task.sprint_id === sprint.id);
        const summary = buildTaskSummary(sprintTasks);
        return (
          <div key={sprint.id} className="space-y-3 rounded-md border bg-muted/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold">{sprint.name}</h3>
                <p className="text-xs text-muted-foreground">
                  {formatDate(sprint.start_date)} – {formatDate(sprint.end_date)} · {sprint.status ?? "Planned"}
                </p>
              </div>
              <Badge variant="outline">{sprintTasks.length} items</Badge>
            </div>
            <Progress value={summary.completion} className="h-2" />
            <p className="text-xs text-muted-foreground">{summary.completion}% complete · {summary.blocked} blocked</p>
            {sprint.description ? <p className="text-xs text-muted-foreground">{sprint.description}</p> : null}
          </div>
        );
      })}
    </div>
  );
}

function CalendarTab({ calendarWeeks }: RenderContext) {
  if (calendarWeeks.length === 0) {
    return <p className="text-sm text-muted-foreground">No upcoming dates to display.</p>;
  }

  return (
    <div className="space-y-4">
      {calendarWeeks.map(week => (
        <div key={week.key} className="space-y-3 rounded-md border bg-muted/10 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Week of {week.weekStart}</h3>
            <Badge variant="outline">{week.entries.length}</Badge>
          </div>
          <div className="space-y-2">
            {week.entries.map(task => (
              <div key={task.id} className="flex items-center justify-between text-sm">
                <span>{task.title ?? "Untitled"}</span>
                <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineTab({ timeline }: RenderContext) {
  if (timeline.length === 0) {
    return <p className="text-sm text-muted-foreground">No scheduling metadata captured yet.</p>;
  }

  return (
    <div className="space-y-3">
      {timeline.map(task => (
        <div key={task.id} className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-sm font-medium">
            <span>{task.title ?? "Untitled"}</span>
            <Badge variant="outline">{task.status ?? "todo"}</Badge>
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Start {formatDate(task.start)}</span>
            <span>End {formatDate(task.end)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function DependenciesTab({ dependencies, tasks }: RenderContext) {
  if (dependencies.length === 0) {
    return <p className="text-sm text-muted-foreground">No recorded dependencies for this project.</p>;
  }

  const taskById = new Map(tasks.map(task => [task.id, task]));

  return (
    <div className="space-y-4">
      {dependencies.map(dep => {
        const source = taskById.get(dep.source_task_id);
        const target = taskById.get(dep.target_task_id);
        return (
          <div key={dep.id} className="space-y-2 rounded-md border bg-muted/20 p-3">
            <div className="flex flex-col gap-2 text-sm md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-medium">{source?.title ?? "External item"}</p>
                <p className="text-xs text-muted-foreground">Blocks → {target?.title ?? "External item"}</p>
              </div>
              <Badge variant="outline">{dep.relationship_type ?? "finish-to-start"}</Badge>
            </div>
            {dep.lag_days ? (
              <p className="text-xs text-muted-foreground">Lead/Lag: {dep.lag_days}d</p>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ReportsTab({ summary, tasks }: RenderContext) {
  const cycleTime = tasks
    .filter(task => task.start_date && task.end_date)
    .map(task => {
      try {
        return Math.max(0, differenceInDays(parseISO(task.end_date!), parseISO(task.start_date!)));
      } catch {
        return null;
      }
    })
    .filter((value): value is number => value !== null);

  const avgCycle = cycleTime.length ? Math.round(cycleTime.reduce((acc, value) => acc + value, 0) / cycleTime.length) : null;

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricTile label="Completion" value={`${summary.completion}%`} tone="success" />
      <MetricTile label="Open items" value={summary.total - summary.byStatus.done} tone="warning" />
      <MetricTile label="Overdue" value={summary.overdue} tone={summary.overdue > 0 ? "destructive" : "muted"} />
      <MetricTile label="Blocked" value={summary.blocked} tone={summary.blocked > 0 ? "destructive" : "muted"} />
      <MetricTile label="Upcoming" value={summary.upcoming} tone="muted" />
      <MetricTile label="Avg cycle time" value={avgCycle ? `${avgCycle}d` : "—"} tone="muted" />
    </div>
  );
}

function DocsTab({ docs }: RenderContext) {
  if (docs.length === 0) {
    return <p className="text-sm text-muted-foreground">No documents created yet.</p>;
  }

  const topDocs = docs.slice(0, 8);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {topDocs.map(doc => (
        <Card key={doc.id} className="border bg-muted/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">{doc.title}</CardTitle>
            <CardDescription className="text-xs">Updated {formatRelative(doc.updated_at)}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="line-clamp-3 text-xs text-muted-foreground">{doc.excerpt ?? ""}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function FilesTab() {
  return (
    <Alert>
      <AlertTitle>Files library coming online</AlertTitle>
      <AlertDescription>
        File storage is provisioned at the workspace level. Connect your storage bucket in project settings to enable inline
        previews and approvals.
      </AlertDescription>
    </Alert>
  );
}

function AutomationsTab({ automations }: RenderContext) {
  if (automations.length === 0) {
    return <p className="text-sm text-muted-foreground">No automations defined yet.</p>;
  }

  return (
    <div className="space-y-4">
      {automations.map(rule => (
        <div key={rule.id} className="space-y-2 rounded-md border bg-muted/20 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{rule.name}</span>
            <Badge variant={rule.is_active ? "success" : "secondary"}>{rule.is_active ? "Active" : "Paused"}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{rule.description ?? "No description"}</p>
          <p className="text-[11px] text-muted-foreground">
            Last run {rule.last_executed_at ? formatRelative(rule.last_executed_at) : "never"} · {rule.execution_count} executions
          </p>
        </div>
      ))}
    </div>
  );
}

function SettingsTab({ project }: RenderContext) {
  const modules = project.modules ?? [];
  const lifecycle = project.lifecycle ?? null;

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Enabled modules</h2>
        {modules.length === 0 ? (
          <p className="text-sm text-muted-foreground">No optional modules enabled.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {modules.map(module => (
              <Badge key={module} variant="outline" className="capitalize">
                {module.replaceAll("_", " ")}
              </Badge>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Lifecycle</h2>
        {lifecycle?.phases?.length ? (
          <div className="space-y-3">
            {lifecycle.phases.map((phase: any) => (
              <div key={phase.key} className="rounded-md border bg-muted/20 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{phase.label}</span>
                  <span className="text-xs text-muted-foreground">Gate {formatDate(phase.gate_date)}</span>
                </div>
                {phase.description ? (
                  <p className="text-xs text-muted-foreground">{phase.description}</p>
                ) : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No lifecycle phases configured.</p>
        )}
      </section>
    </div>
  );
}

function MetricTile({ label, value, tone }: { label: string; value: string | number; tone: "muted" | "warning" | "success" | "destructive" }) {
  const toneMap: Record<typeof tone, string> = {
    muted: "bg-muted/40",
    warning: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100",
    success: "bg-emerald-100 text-emerald-900 dark:bg-emerald-500/20 dark:text-emerald-100",
    destructive: "bg-red-100 text-red-900 dark:bg-red-500/20 dark:text-red-100",
  } as const;

  return (
    <div className="space-y-1 rounded-lg border bg-background p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <span className={cn("inline-flex items-center rounded-md px-2 py-1 text-sm font-semibold", toneMap[tone])}>{value}</span>
    </div>
  );
}
