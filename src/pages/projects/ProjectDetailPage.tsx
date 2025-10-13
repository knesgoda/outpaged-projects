// @ts-nocheck
import { useCallback, useEffect, useMemo, useState } from "react";
import type { ComponentType, ReactNode, SVGProps } from "react";
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
  BarChart3,
  BookOpen,
  CalendarClock,
  Folder,
  GitBranch,
  MoveDown,
  MoveUp,
  Flag,
  LayoutDashboard,
  LayoutList,
  ListChecks,
  ListTodo,
  MoreHorizontal,
  Plus,
  Settings,
  Star,
  Timer,
  Users,
  Sparkles,
} from "lucide-react";

import { Helmet } from "react-helmet-async";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
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
import { useConnectivityStatus } from "@/hooks/useConnectivityStatus";
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
  { value: "backlog", label: "Backlog", icon: ListTodo, description: "Rank and triage intake." },
  { value: "kanban", label: "Kanban", icon: LayoutDashboard, description: "Flow of work with WIP awareness." },
  { value: "timeline", label: "Timeline", icon: GitBranch, description: "Scheduling and dependency view." },
  { value: "calendar", label: "Calendar", icon: CalendarClock, description: "Dates and upcoming milestones." },
  { value: "reports", label: "Reports", icon: BarChart3, description: "Velocity, throughput, and risk." },
  { value: "releases", label: "Releases", icon: Flag, description: "Track launch readiness." },
  { value: "docs", label: "Docs", icon: BookOpen, description: "Knowledge captured inside the project." },
  { value: "files", label: "Files", icon: Folder, description: "Shared assets and approvals." },
  { value: "automations", label: "Automations", icon: Sparkles, description: "Recipes that keep the project humming." },
  { value: "members", label: "Members", icon: Users, description: "Project roster and workload." },
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

type OverviewWidgetId =
  | "status"
  | "burn"
  | "deadlines"
  | "blockers"
  | "cfd"
  | "risks"
  | "sla"
  | "workload";

interface OverviewWidgetState {
  order: OverviewWidgetId[];
  hidden: OverviewWidgetId[];
}

interface OverviewWidgetInstance {
  id: OverviewWidgetId;
  title: string;
  description: string;
  content: ReactNode;
}

const DEFAULT_OVERVIEW_WIDGET_ORDER: OverviewWidgetId[] = [
  "status",
  "burn",
  "deadlines",
  "blockers",
  "cfd",
  "risks",
  "sla",
  "workload",
];

function normalizeWidgetState(state: OverviewWidgetState): OverviewWidgetState {
  const order = state.order.filter(id => DEFAULT_OVERVIEW_WIDGET_ORDER.includes(id));
  for (const id of DEFAULT_OVERVIEW_WIDGET_ORDER) {
    if (!order.includes(id)) {
      order.push(id);
    }
  }

  const hidden = state.hidden.filter(id => DEFAULT_OVERVIEW_WIDGET_ORDER.includes(id));
  return { order, hidden };
}

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
  const connectivity = useConnectivityStatus();

  const [favoriteProjects, setFavoriteProjects] = useState<string[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }
    try {
      const stored = window.localStorage.getItem("project:favorites");
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
    } catch (error) {
      console.warn("Failed to load favorite projects", error);
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("project:favorites", JSON.stringify(favoriteProjects));
    } catch (error) {
      console.warn("Failed to persist favorite projects", error);
    }
  }, [favoriteProjects]);

  const isFavorite = useMemo(() => {
    if (!projectId) return false;
    return favoriteProjects.includes(projectId);
  }, [favoriteProjects, projectId]);

  const toggleFavorite = useCallback(() => {
    if (!projectId) return;
    setFavoriteProjects(previous => {
      if (previous.includes(projectId)) {
        return previous.filter(entry => entry !== projectId);
      }
      return [...previous, projectId];
    });
  }, [projectId]);

  const [widgetState, setWidgetState] = useState<OverviewWidgetState>(() => {
    const fallback = normalizeWidgetState({
      order: DEFAULT_OVERVIEW_WIDGET_ORDER,
      hidden: [],
    });
    if (typeof window === "undefined") {
      return fallback;
    }
    if (!projectId) return fallback;
    try {
      const stored = window.localStorage.getItem(`project:${projectId}:overview-widgets`);
      if (!stored) return fallback;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        return normalizeWidgetState({
          order: Array.isArray(parsed.order) ? parsed.order : DEFAULT_OVERVIEW_WIDGET_ORDER,
          hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
        });
      }
    } catch (error) {
      console.warn("Failed to load overview widgets", error);
    }
    return fallback;
  });

  useEffect(() => {
    if (!projectId || typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem(`project:${projectId}:overview-widgets`);
      if (!stored) return;
      const parsed = JSON.parse(stored);
      if (parsed && typeof parsed === "object") {
        setWidgetState(
          normalizeWidgetState({
            order: Array.isArray(parsed.order) ? parsed.order : DEFAULT_OVERVIEW_WIDGET_ORDER,
            hidden: Array.isArray(parsed.hidden) ? parsed.hidden : [],
          }),
        );
      }
    } catch (error) {
      console.warn("Failed to hydrate overview widgets", error);
    }
  }, [projectId]);

  const updateWidgetState = useCallback((updater: (previous: OverviewWidgetState) => OverviewWidgetState) => {
    setWidgetState(previous => normalizeWidgetState(updater(previous)));
  }, []);

  useEffect(() => {
    if (!projectId || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(`project:${projectId}:overview-widgets`, JSON.stringify(widgetState));
    } catch (error) {
      console.warn("Failed to persist overview widgets", error);
    }
  }, [projectId, widgetState]);

  const [customizeOpen, setCustomizeOpen] = useState(false);

  const handleWidgetVisibility = useCallback(
    (id: OverviewWidgetId, visible: boolean) => {
      updateWidgetState(previous => {
        const hiddenSet = new Set(previous.hidden);
        if (!visible) {
          hiddenSet.add(id);
        } else {
          hiddenSet.delete(id);
        }
        return { ...previous, hidden: Array.from(hiddenSet) };
      });
    },
    [updateWidgetState],
  );

  const handleWidgetReorder = useCallback(
    (id: OverviewWidgetId, direction: "up" | "down") => {
      updateWidgetState(previous => {
        const order = [...previous.order];
        const index = order.indexOf(id);
        if (index === -1) return previous;
        const nextIndex = direction === "up" ? Math.max(index - 1, 0) : Math.min(index + 1, order.length - 1);
        if (index === nextIndex) return previous;
        const [entry] = order.splice(index, 1);
        order.splice(nextIndex, 0, entry);
        return { ...previous, order };
      });
    },
    [updateWidgetState],
  );

  const normalizedWidgetState = useMemo(() => normalizeWidgetState(widgetState), [widgetState]);

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

  const blockedTasks = useMemo(
    () =>
      tasks
        .filter(task => task.blocked)
        .sort((left, right) => {
          const leftDate = left.updated_at ? new Date(left.updated_at).getTime() : 0;
          const rightDate = right.updated_at ? new Date(right.updated_at).getTime() : 0;
          return rightDate - leftDate;
        })
        .slice(0, 5),
    [tasks],
  );

  const upcomingDeadlines = useMemo(
    () =>
      tasks
        .filter(task => task.due_date && isAfter(parseISO(task.due_date), new Date()))
        .sort((left, right) => {
          if (!left.due_date || !right.due_date) return 0;
          return parseISO(left.due_date).getTime() - parseISO(right.due_date).getTime();
        })
        .slice(0, 6),
    [tasks],
  );

  const overdueTasks = useMemo(
    () =>
      tasks
        .filter(task => {
          if (!task.due_date) return false;
          try {
            return isBefore(parseISO(task.due_date), new Date()) && (task.status ?? "").toLowerCase() !== "done";
          } catch {
            return false;
          }
        })
        .sort((left, right) => {
          if (!left.due_date || !right.due_date) return 0;
          return parseISO(left.due_date).getTime() - parseISO(right.due_date).getTime();
        })
        .slice(0, 6),
    [tasks],
  );

  const slaWeeks = useMemo(() => calendarWeeks.slice(0, 6), [calendarWeeks]);
  const maxSlaVolume = useMemo(() => Math.max(1, ...slaWeeks.map(week => week.entries.length)), [slaWeeks]);

  const health = useMemo(() => (project ? getHealthColor(project.status, summary) : null), [project, summary]);

  const healthClasses = useMemo(() => {
    if (!health) {
      return { badge: "border-muted text-muted-foreground", dot: "bg-muted" };
    }
    switch (health.badge) {
      case "destructive":
        return { badge: "border-destructive/70 text-destructive", dot: "bg-destructive" };
      case "warning":
        return { badge: "border-amber-500/60 text-amber-600", dot: "bg-amber-500" };
      case "success":
        return { badge: "border-emerald-500/60 text-emerald-600", dot: "bg-emerald-500" };
      default:
        return { badge: "border-muted text-emerald-600", dot: "bg-emerald-500" };
    }
  }, [health]);

  const overviewWidgetMap = useMemo(() => {
    const widgets: Record<OverviewWidgetId, OverviewWidgetInstance> = {
      status: {
        id: "status",
        title: "Status summary",
        description: "Distribution of work items across states.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Status summary</CardTitle>
              <CardDescription className="text-xs">Track throughput across key swimlanes.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              <MetricTile label="To do" value={summary.byStatus.todo} tone="muted" />
              <MetricTile label="In progress" value={summary.byStatus.inProgress} tone="warning" />
              <MetricTile label="Done" value={summary.byStatus.done} tone="success" />
            </CardContent>
          </Card>
        ),
      },
      burn: {
        id: "burn",
        title: "Burn-up & burn-down",
        description: "Completion trajectory across items and points.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Burn-up & burn-down</CardTitle>
              <CardDescription className="text-xs">Progress across scope and velocity.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{summary.byStatus.done} done</span>
                  <span>{summary.total} total</span>
                </div>
                <Progress value={summary.completion} className="h-2" />
                <p className="text-xs text-muted-foreground">{summary.completion}% items complete</p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span>Story points delivered</span>
                  <span>{summary.pointCompletion === null ? "—" : `${summary.pointCompletion}%`}</span>
                </div>
                <p className="mt-1 text-muted-foreground">Based on recorded story points.</p>
              </div>
            </CardContent>
          </Card>
        ),
      },
      deadlines: {
        id: "deadlines",
        title: "Upcoming deadlines",
        description: "Due items in the next sprint window.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Upcoming deadlines</CardTitle>
              <CardDescription className="text-xs">Next six items due soon.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcomingDeadlines.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deadlines in the next two weeks.</p>
              ) : (
                upcomingDeadlines.map(task => (
                  <div key={task.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="space-y-1">
                      <p className="font-medium leading-tight">{task.title ?? "Untitled"}</p>
                      <p className="text-xs text-muted-foreground">{task.priority ?? "Medium"} priority</p>
                    </div>
                    <Badge variant="outline" className="shrink-0">
                      {formatDate(task.due_date)}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ),
      },
      blockers: {
        id: "blockers",
        title: "Risks & blockers",
        description: "Items awaiting intervention.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Risks & blockers</CardTitle>
              <CardDescription className="text-xs">Escalate impediments quickly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {blockedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active blockers detected.</p>
              ) : (
                blockedTasks.map(task => (
                  <div key={task.id} className="space-y-1 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{task.title ?? "Untitled"}</p>
                      <Badge variant="destructive" className="uppercase">
                        {(task.priority ?? "").slice(0, 1) || "!"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{task.blocking_reason ?? "No reason provided."}</p>
                    <p className="text-xs text-muted-foreground">Due {formatDate(task.due_date)}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        ),
      },
      cfd: {
        id: "cfd",
        title: "Cumulative flow",
        description: "Snapshot of work-in-progress load.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Cumulative flow</CardTitle>
              <CardDescription className="text-xs">Understand bottlenecks at a glance.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>To do</TableCell>
                    <TableCell className="text-right">{summary.byStatus.todo}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>In progress</TableCell>
                    <TableCell className="text-right">{summary.byStatus.inProgress}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Done</TableCell>
                    <TableCell className="text-right">{summary.byStatus.done}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ),
      },
      risks: {
        id: "risks",
        title: "Overdue risks",
        description: "Past-due work that needs triage.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Overdue risks</CardTitle>
              <CardDescription className="text-xs">Items breaching commitments.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overdueTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No overdue work right now.</p>
              ) : (
                overdueTasks.map(task => {
                  const days = task.due_date ? Math.abs(differenceInDays(new Date(), parseISO(task.due_date))) : 0;
                  return (
                    <div key={task.id} className="flex items-center justify-between rounded-md border bg-muted/30 p-3 text-sm">
                      <div className="space-y-1">
                        <p className="font-medium leading-tight">{task.title ?? "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">Owner: {task.team_assigned ?? "Unassigned"}</p>
                      </div>
                      <Badge variant="destructive">{days}d</Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ),
      },
      sla: {
        id: "sla",
        title: "SLA heatmap",
        description: "Due-week workload and breaches.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">SLA heatmap</CardTitle>
              <CardDescription className="text-xs">Volume of due work grouped by week.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {slaWeeks.length === 0 ? (
                <p className="text-sm text-muted-foreground">No scheduled work yet.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {slaWeeks.map(week => {
                    const ratio = week.entries.length / maxSlaVolume;
                    const intensity = Math.max(0.12, ratio);
                    return (
                      <div key={week.key} className="space-y-1">
                        <div
                          className="rounded-md border px-3 py-4 text-center text-sm font-semibold"
                          style={{
                            backgroundColor: `hsl(142 71% ${Math.max(25, 92 - intensity * 40)}%)`,
                            color: intensity > 0.6 ? "#0f172a" : "#0b3d2e",
                          }}
                        >
                          {week.entries.length}
                        </div>
                        <p className="text-[11px] text-muted-foreground">Week of {week.weekStart}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        ),
      },
      workload: {
        id: "workload",
        title: "Workload by team",
        description: "Balance staffing and commitments.",
        content: (
          <Card className="h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Workload by team</CardTitle>
              <CardDescription className="text-xs">Top teams and overdue ratio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team assignments recorded.</p>
              ) : (
                teamBreakdown.slice(0, 6).map(entry => {
                  const overdueRatio = entry.count === 0 ? 0 : (entry.overdue / entry.count) * 100;
                  return (
                    <div key={entry.team} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span>{entry.team}</span>
                        <span>{entry.count}</span>
                      </div>
                      <Progress value={Math.min(100, 100 - overdueRatio)} className="h-2" />
                      <p className="text-[11px] text-muted-foreground">{entry.overdue} overdue</p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        ),
      },
    };

    return widgets;
  }, [
    summary.byStatus.done,
    summary.byStatus.inProgress,
    summary.byStatus.todo,
    summary.completion,
    summary.pointCompletion,
    summary.total,
    blockedTasks,
    upcomingDeadlines,
    overdueTasks,
    slaWeeks,
    maxSlaVolume,
    teamBreakdown,
  ]);

  const allOverviewWidgets = useMemo(
    () =>
      DEFAULT_OVERVIEW_WIDGET_ORDER.map(id => overviewWidgetMap[id]).filter(
        (widget): widget is OverviewWidgetInstance => Boolean(widget),
      ),
    [overviewWidgetMap],
  );

  const visibleOverviewWidgets = useMemo(
    () =>
      normalizedWidgetState.order
        .map(id => overviewWidgetMap[id])
        .filter((widget): widget is OverviewWidgetInstance => Boolean(widget))
        .filter(widget => !normalizedWidgetState.hidden.includes(widget.id)),
    [normalizedWidgetState.hidden, normalizedWidgetState.order, overviewWidgetMap],
  );

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

  const quickActions = useMemo(
    () =>
      projectId
        ? [
            {
              id: "new-item",
              label: "New item",
              description: "Capture work instantly",
              icon: Plus,
              disabled: !canCreateItems || connectivity.state === "offline",
              onSelect: () => navigate(`/tasks?projectId=${projectId}`),
            },
            {
              id: "plan-sprint",
              label: "Plan sprint",
              description: "Schedule the next iteration",
              icon: Timer,
              disabled: !canManageLifecycle,
              onSelect: () => navigate(`/projects/${projectId}/sprints`),
            },
            {
              id: "run-report",
              label: "Reports",
              description: "Open delivery analytics",
              icon: BarChart3,
              disabled: false,
              onSelect: () => handleNavigateToTab("reports"),
            },
            {
              id: "automation",
              label: "Automations",
              description: "Tune runbooks",
              icon: Sparkles,
              disabled: !canManageAutomations,
              onSelect: () => navigate(`/projects/${projectId}/automations`),
            },
          ]
        : [],
    [
      projectId,
      canCreateItems,
      canManageLifecycle,
      canManageAutomations,
      connectivity.state,
      navigate,
      handleNavigateToTab,
    ],
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
    overviewWidgets: visibleOverviewWidgets,
    openOverviewCustomizer: () => setCustomizeOpen(true),
  });

  const activityFeed = useMemo(() => {
    const entries: { id: string; title: string; description: string; timestamp: string | null; categories: string[] }[] = [];

    for (const task of tasks) {
      const categories = ["updates"];
      const statusLabel = (task.status ?? "todo").replaceAll("_", " ");
      if (task.blocked) {
        categories.push("risks");
      }
      if ((task.blocking_reason ?? "").includes("@")) {
        categories.push("mentions");
      }
      if (task.due_date) {
        try {
          if (isBefore(parseISO(task.due_date), new Date()) && statusLabel.toLowerCase() !== "done") {
            categories.push("risks");
          }
        } catch {
          // ignore
        }
      }
      entries.push({
        id: `task-${task.id}`,
        title: task.title ?? "Untitled item",
        description: `${statusLabel} · ${task.team_assigned ?? "Unassigned"}`,
        timestamp: task.updated_at ?? task.due_date,
        categories,
      });
    }

    for (const doc of docs.slice(0, 12)) {
      entries.push({
        id: `doc-${doc.id}`,
        title: doc.title ?? "Untitled doc",
        description: "Documentation update",
        timestamp: doc.updated_at ?? doc.created_at ?? null,
        categories: ["docs"],
      });
    }

    for (const automation of automations.slice(0, 12)) {
      entries.push({
        id: `automation-${automation.id}`,
        title: automation.name,
        description: automation.is_active ? "Automation ran" : "Automation updated",
        timestamp: automation.last_executed_at,
        categories: ["automation"],
      });
    }

    entries.sort((left, right) => {
      const leftDate = left.timestamp ? new Date(left.timestamp).getTime() : 0;
      const rightDate = right.timestamp ? new Date(right.timestamp).getTime() : 0;
      return rightDate - leftDate;
    });

    return entries;
  }, [automations, docs, tasks]);

  const [activityFilter, setActivityFilter] = useState("all");

  const filteredActivity = useMemo(
    () =>
      activityFeed.filter(entry => activityFilter === "all" || entry.categories.includes(activityFilter)).slice(0, 12),
    [activityFeed, activityFilter],
  );

  const lastSyncedLabel = useMemo(() => {
    if (!connectivity.lastSyncedAt) return "recently";
    try {
      return formatDistanceToNow(new Date(connectivity.lastSyncedAt), { addSuffix: true });
    } catch {
      return "recently";
    }
  }, [connectivity.lastSyncedAt]);

  const updatedDate = project?.updated_at ? new Date(project.updated_at) : null;
  const lastUpdatedLabel = updatedDate && !Number.isNaN(updatedDate.getTime())
    ? formatDistanceToNow(updatedDate, { addSuffix: true })
    : "Unknown";
  const openItems = summary.total - summary.byStatus.done;
  const queueSize = connectivity.summary?.total ?? 0;
  const activityFilters = [
    { value: "all", label: "All" },
    { value: "updates", label: "Updates" },
    { value: "mentions", label: "Mentions" },
    { value: "docs", label: "Docs" },
    { value: "automation", label: "Automations" },
    { value: "risks", label: "Risks" },
  ];

  const offlineDescription =
    connectivity.state === "offline"
      ? "You're offline. Changes will sync when you're connected."
      : connectivity.state === "queue"
        ? `${queueSize} change(s) waiting to sync.`
        : connectivity.state === "syncing"
          ? "Processing queued updates."
          : `Last synced ${lastSyncedLabel}.`;

  return (
    <div className="space-y-6 pb-24 pt-6 lg:pb-6">
      <Helmet>
        <title>{pageTitle}</title>
      </Helmet>
      {renderBreadcrumbForState(currentTab.label, { linkProject: true })}
      {connectivity.state !== "online" ? (
        <Alert
          variant={connectivity.state === "offline" ? "destructive" : "default"}
          className="sticky top-16 z-40 border-dashed"
        >
          <AlertTitle>
            {connectivity.state === "offline" ? "Offline mode" : "Syncing offline changes"}
          </AlertTitle>
          <AlertDescription>{offlineDescription}</AlertDescription>
        </Alert>
      ) : null}

      <section className="sticky top-16 z-30 -mx-4 space-y-4 rounded-2xl border bg-background/95 p-4 shadow-sm backdrop-blur supports-[backdrop-filter]:backdrop-blur sm:-mx-0 sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden"
                aria-pressed={isFavorite}
                onClick={toggleFavorite}
              >
                <Star
                  className={cn(
                    "h-4 w-4",
                    isFavorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground",
                  )}
                />
                <span className="sr-only">Toggle favorite</span>
              </Button>
              <h1 className="text-3xl font-semibold tracking-tight">{project.name}</h1>
              <Badge variant={getProjectStatusBadgeVariant(project.status)}>
                {formatProjectStatus(project.status)}
              </Badge>
              {health ? (
                <Badge variant="outline" className={cn("flex items-center gap-1", healthClasses.badge)}>
                  <span className={cn("h-2 w-2 rounded-full", healthClasses.dot)} />
                  {health.label}
                </Badge>
              ) : null}
            </div>
            {project.description ? (
              <p className="max-w-3xl text-sm text-muted-foreground">{project.description}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Project key: {project.code ?? "—"}</span>
              <span>Updated {lastUpdatedLabel}</span>
              <span>Items: {summary.total}</span>
              <span>Open: {openItems}</span>
              <span>Blocked: {summary.blocked}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="hidden sm:inline-flex"
              aria-pressed={isFavorite}
              onClick={toggleFavorite}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  isFavorite ? "fill-yellow-400 text-yellow-500" : "text-muted-foreground",
                )}
              />
              <span className="sr-only">Toggle favorite</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate(`/projects/${projectId}/settings`)}
              disabled={!projectId || !canManageSettings}
            >
              <Settings className="mr-2 h-4 w-4" /> Settings
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Lifecycle</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={handleArchive}
                  disabled={!canManageLifecycle || archiveMutation.isPending || updateMutation.isPending}
                >
                  {project.status === "archived" ? "Restore project" : "Archive project"}
                </DropdownMenuItem>
                {canDeleteProject ? (
                  <DropdownMenuItem onClick={handleDelete} disabled={deleteMutation.isPending}>
                    Delete project
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleNavigateToTab("automations")}>
                  Open automations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Progress</p>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold">{summary.completion}%</span>
              <span className="text-xs text-muted-foreground">{summary.byStatus.done}/{summary.total}</span>
            </div>
            <Progress value={summary.completion} className="mt-2 h-2" />
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Next milestone</p>
            <p className="mt-2 text-sm font-medium">
              {milestone ? milestone.label : "No milestone detected"}
            </p>
            <p className="text-xs text-muted-foreground">
              {milestone
                ? `${formatDate(milestone.date)} · ${formatRelative(milestone.date)}`
                : "Add upcoming deliverables to track them here."}
            </p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Offline queue</p>
            <p className="mt-2 text-sm font-medium">{queueSize}</p>
            <p className="text-xs text-muted-foreground">{offlineDescription}</p>
          </div>
          <div className="rounded-lg border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">Upcoming work</p>
            <p className="mt-2 text-sm font-medium">{upcomingDeadlines.length} due soon</p>
            <p className="text-xs text-muted-foreground">Next: {upcomingDeadlines[0] ? formatDate(upcomingDeadlines[0].due_date) : "—"}</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-2">
            {quickActions.map(action => (
              <Button
                key={action.id}
                variant="secondary"
                className="flex-shrink-0"
                disabled={action.disabled}
                onClick={action.onSelect}
              >
                <action.icon className="mr-2 h-4 w-4" />
                {action.label}
              </Button>
            ))}
            <Button variant="outline" onClick={() => setCustomizeOpen(true)}>
              <ListChecks className="mr-2 h-4 w-4" /> Customize overview
            </Button>
          </div>
        </div>
      </section>

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
              <CardTitle className="text-sm font-semibold">Activity feed</CardTitle>
              <CardDescription className="text-xs">Mentions, automations, and work updates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2 text-xs">
                {activityFilters.map(filter => {
                  const isActive = activityFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setActivityFilter(filter.value)}
                      className={cn(
                        "rounded-full border px-3 py-1",
                        isActive ? "border-primary bg-primary/10 text-primary" : "border-muted"
                      )}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
              <div className="space-y-3">
                {filteredActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No activity yet.</p>
                ) : (
                  filteredActivity.map(entry => (
                    <div key={entry.id} className="space-y-1 rounded-md border bg-muted/20 p-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-tight">{entry.title}</p>
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {entry.categories[0] ?? "updates"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.timestamp ? formatRelative(entry.timestamp) : "Just now"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Team load</CardTitle>
              <CardDescription className="text-xs">Current distribution by team.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team assignments recorded.</p>
              ) : (
                teamBreakdown.slice(0, 8).map(entry => (
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

      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Customize overview</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {allOverviewWidgets.map((widget, index) => {
              const isVisible = !normalizedWidgetState.hidden.includes(widget.id);
              return (
                <div key={widget.id} className="flex items-center justify-between gap-4 rounded-md border p-3">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWidgetReorder(widget.id, "up")}
                        disabled={index === 0}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleWidgetReorder(widget.id, "down")}
                        disabled={index === allOverviewWidgets.length - 1}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{widget.title}</p>
                      <p className="text-xs text-muted-foreground">{widget.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`widget-${widget.id}`} className="text-xs">
                      Visible
                    </Label>
                    <Switch
                      id={`widget-${widget.id}`}
                      checked={isVisible}
                      onCheckedChange={checked => handleWidgetVisibility(widget.id, checked)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 shadow-lg backdrop-blur supports-[backdrop-filter]:backdrop-blur lg:hidden">
        <div className="flex gap-2 overflow-x-auto">
          {quickActions.slice(0, 3).map(action => (
            <Button
              key={action.id}
              onClick={action.onSelect}
              disabled={action.disabled}
              className="flex-1 whitespace-nowrap"
            >
              <action.icon className="mr-2 h-4 w-4" />
              {action.label}
            </Button>
          ))}
        </div>
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
  overviewWidgets: OverviewWidgetInstance[];
  openOverviewCustomizer: () => void;
};

function renderTabContent(context: RenderContext) {
  switch (context.activeTab) {
    case "overview":
      return <OverviewTab {...context} />;
    case "kanban":
      return <BoardTab {...context} />;
    case "backlog":
      return <BacklogTab {...context} />;
    case "calendar":
      return <CalendarTab {...context} />;
    case "timeline":
      return <TimelineTab {...context} />;
    case "reports":
      return <ReportsTab {...context} />;
    case "releases":
      return <ReleasesTab {...context} />;
    case "docs":
      return <DocsTab {...context} />;
    case "files":
      return <FilesTab {...context} />;
    case "automations":
      return <AutomationsTab {...context} />;
    case "members":
      return <MembersTab {...context} />;
    case "settings":
      return <SettingsTab {...context} />;
    default:
      return <OverviewTab {...context} />;
  }
}

function OverviewTab({ overviewWidgets, openOverviewCustomizer }: RenderContext) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-base font-semibold">Delivery overview</h2>
          <p className="text-sm text-muted-foreground">
            Track health, flow, and commitments with configurable widgets.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={openOverviewCustomizer} className="w-full sm:w-auto">
          <ListChecks className="mr-2 h-4 w-4" /> Customize widgets
        </Button>
      </div>

      {overviewWidgets.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          All widgets are hidden. Use the customize controls to bring modules back into view.
        </div>
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {overviewWidgets.map(widget => (
            <div key={widget.id} className="min-h-[180px]">{widget.content}</div>
          ))}
        </div>
      )}
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
