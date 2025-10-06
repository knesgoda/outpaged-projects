import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { format, formatISO, parseISO } from "date-fns";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { WidgetFrame } from "@/components/dashboard/WidgetFrame";
import { CounterWidget } from "@/components/dashboard/CounterWidget";
import { BarChartWidget } from "@/components/dashboard/BarChartWidget";
import { PieChartWidget } from "@/components/dashboard/PieChartWidget";
import { LineChartWidget, LineSeries } from "@/components/dashboard/LineChartWidget";
import { TableWidget, TableWidgetColumn } from "@/components/dashboard/TableWidget";
import {
  useDashboard,
  useDashboardMutations,
  useDashboardWidgetMutations,
  useDashboardWidgets,
} from "@/hooks/useDashboards";
import type { DashboardWidget } from "@/types";
import { WorkloadQueryParams, getDetailedTimeEntries, getWorkloadSummary, getWorkloadTasks } from "@/services/workload";
import { ProjectSummary, getProject, listProjects } from "@/services/projects";

const CLOSED_STATUSES = new Set(["done", "archived", "completed", "cancelled", "resolved"]);

const DEFAULT_TEMPLATE_BY_TYPE: Record<DashboardWidget["type"], TemplateId> = {
  counter: "open_tasks_count",
  bar: "tasks_by_status",
  pie: "tasks_by_assignee",
  line: "estimate_vs_logged",
  table: "overdue_tasks_table",
};

const DATE_REPRESENTATION: Parameters<typeof formatISO>[1] = { representation: "date" };

function normalizeDate(value?: string | null) {
  if (!value) return undefined;
  try {
    return formatISO(parseISO(value), DATE_REPRESENTATION);
  } catch (_error) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return undefined;
    }
    return formatISO(parsed, DATE_REPRESENTATION);
  }
}

type TemplateId =
  | "open_tasks_count"
  | "overdue_tasks_count"
  | "tasks_by_status"
  | "tasks_by_assignee"
  | "estimate_vs_logged"
  | "active_projects_count"
  | "overdue_tasks_table";

type WidgetConfig = {
  template: TemplateId;
  projectId?: string | null;
  dateFrom?: string | null;
  dateTo?: string | null;
  statusFilter?: "open" | "all";
  visualization?: "bar" | "pie";
  includeTime?: boolean;
};

type WidgetDraft = {
  id?: string;
  type: DashboardWidget["type"];
  title?: string | null;
  config: WidgetConfig;
};

type WidgetComputation =
  | { variant: "counter"; value: number; label?: string; comparisonLabel?: string; comparisonValue?: number }
  | { variant: "bar"; data: { label: string; value: number }[]; orientation?: "vertical" | "horizontal" }
  | { variant: "pie"; data: { label: string; value: number }[] }
  | { variant: "line"; series: LineSeries[] }
  | { variant: "table"; columns: TableWidgetColumn[]; rows: Record<string, string | number>[]; emptyMessage?: string };

type TemplateDefinition = {
  id: TemplateId;
  label: string;
  description: string;
  type: DashboardWidget["type"];
  defaultTitle: string;
  defaultVisualization?: "bar" | "pie";
  requiresTime?: boolean;
};

const TEMPLATE_DEFINITIONS: TemplateDefinition[] = [
  {
    id: "open_tasks_count",
    label: "Open tasks",
    description: "Total tasks not marked complete in the selected range.",
    type: "counter",
    defaultTitle: "Open tasks",
  },
  {
    id: "overdue_tasks_count",
    label: "Overdue tasks",
    description: "Tasks past their due date that still need attention.",
    type: "counter",
    defaultTitle: "Overdue tasks",
  },
  {
    id: "tasks_by_status",
    label: "Tasks by status",
    description: "Visualize task distribution across statuses.",
    type: "bar",
    defaultTitle: "Tasks by status",
    defaultVisualization: "vertical",
  },
  {
    id: "tasks_by_assignee",
    label: "Tasks by assignee",
    description: "Compare task load across the team.",
    type: "pie",
    defaultTitle: "Tasks by assignee",
    defaultVisualization: "pie",
  },
  {
    id: "estimate_vs_logged",
    label: "Estimate vs logged",
    description: "Compare planned effort with actual time tracked.",
    type: "line",
    defaultTitle: "Estimate vs logged",
    requiresTime: true,
  },
  {
    id: "active_projects_count",
    label: "Active projects",
    description: "Count of projects currently accessible to you.",
    type: "counter",
    defaultTitle: "Active projects",
  },
  {
    id: "overdue_tasks_table",
    label: "Overdue task table",
    description: "Detailed list of overdue tasks with estimates.",
    type: "table",
    defaultTitle: "Overdue tasks",
  },
];

const TEMPLATE_LOOKUP = Object.fromEntries(TEMPLATE_DEFINITIONS.map((template) => [template.id, template]));

function getTemplateDefinition(template: TemplateId) {
  return TEMPLATE_LOOKUP[template];
}

function guessTemplateId(widget: { type: DashboardWidget["type"]; config?: any }): TemplateId {
  const templateFromConfig = widget.config?.template as TemplateId | undefined;
  if (templateFromConfig && TEMPLATE_LOOKUP[templateFromConfig]) {
    return templateFromConfig;
  }
  return DEFAULT_TEMPLATE_BY_TYPE[widget.type] ?? "open_tasks_count";
}

function normalizeConfig(widget: WidgetDraft, fallbackProjectId?: string | null): WidgetConfig {
  const template = guessTemplateId(widget);
  const definition = getTemplateDefinition(template);
  const config = widget.config ?? {};
  return {
    template,
    projectId: config.projectId ?? fallbackProjectId ?? null,
    dateFrom: config.dateFrom ?? null,
    dateTo: config.dateTo ?? null,
    statusFilter: config.statusFilter === "all" ? "all" : "open",
    visualization:
      config.visualization ??
      (template === "tasks_by_assignee"
        ? definition.defaultVisualization ?? "pie"
        : config.visualization ?? "bar"),
    includeTime: config.includeTime ?? Boolean(definition.requiresTime),
  };
}

function isClosedStatus(status?: string | null) {
  if (!status) return false;
  return CLOSED_STATUSES.has(status.toLowerCase());
}

function formatLabel(label: string) {
  const parsed = Date.parse(label);
  if (!Number.isNaN(parsed)) {
    try {
      return format(new Date(parsed), "MMM d");
    } catch (_error) {
      return label;
    }
  }
  return label;
}

async function loadWidgetData(
  widget: WidgetDraft,
  options: {
    fallbackProjectId?: string | null;
    projectName?: string | null;
  }
): Promise<WidgetComputation> {
  const config = normalizeConfig(widget, options.fallbackProjectId);
  const definition = getTemplateDefinition(config.template);
  const projectId = config.projectId ?? undefined;

  const params: WorkloadQueryParams = {
    projectId: projectId ?? undefined,
    dateFrom: config.dateFrom ?? undefined,
    dateTo: config.dateTo ?? undefined,
    includeTime: config.includeTime,
    statusFilter: config.statusFilter,
  };

  switch (config.template) {
    case "open_tasks_count": {
      const summary = await getWorkloadSummary({ ...params, includeTime: false });
      const value = summary.reduce((total, row) => total + row.open_tasks, 0);
      return { variant: "counter", value, label: "Open tasks" };
    }
    case "overdue_tasks_count": {
      const summary = await getWorkloadSummary({ ...params, includeTime: false });
      const value = summary.reduce((total, row) => total + row.overdue_tasks, 0);
      return { variant: "counter", value, label: "Overdue tasks" };
    }
    case "tasks_by_status": {
      const tasks = await getWorkloadTasks({ ...params, statusFilter: config.statusFilter ?? "open" });
      const counts = new Map<string, number>();
      tasks.forEach((task) => {
        const statusKey = (task.status ?? "No status").toString();
        counts.set(statusKey, (counts.get(statusKey) ?? 0) + 1);
      });
      const data = Array.from(counts.entries())
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value);
      return { variant: "bar", data };
    }
    case "tasks_by_assignee": {
      const summary = await getWorkloadSummary({ ...params, includeTime: false });
      const data = summary.map((row) => ({
        label: row.assignee_name ?? (row.assignee ? "Member" : "Unassigned"),
        value: row.open_tasks,
      }));
      if (config.visualization === "bar") {
        return { variant: "bar", data, orientation: "vertical" };
      }
      return { variant: "pie", data };
    }
    case "estimate_vs_logged": {
      const tasks = await getWorkloadTasks({ ...params, statusFilter: "all" });
      const estimateByDate = new Map<string, number>();
      tasks.forEach((task) => {
        const dateKey = normalizeDate(task.due_date) ?? normalizeDate(task.created_at) ?? undefined;
        if (!dateKey) return;
        const current = estimateByDate.get(dateKey) ?? 0;
        estimateByDate.set(dateKey, current + (task.estimate_minutes ?? 0));
      });

      const taskIds = tasks.map((task) => task.id);
      const entries = config.includeTime
        ? await getDetailedTimeEntries(taskIds, params)
        : [];
      const loggedByDate = new Map<string, number>();
      entries.forEach((entry) => {
        const dateKey = normalizeDate(entry.entry_date) ?? undefined;
        if (!dateKey) return;
        const current = loggedByDate.get(dateKey) ?? 0;
        loggedByDate.set(dateKey, current + (entry.minutes ?? 0));
      });

      const labels = Array.from(
        new Set([...estimateByDate.keys(), ...loggedByDate.keys()])
      ).sort();

      const estimateSeries: LineSeries = {
        id: "estimates",
        label: "Estimate hours",
        points: labels.map((label) => ({
          label: formatLabel(label),
          value: Number(((estimateByDate.get(label) ?? 0) / 60).toFixed(1)),
        })),
      };

      const loggedSeries: LineSeries = {
        id: "logged",
        label: "Logged hours",
        points: labels.map((label) => ({
          label: formatLabel(label),
          value: Number(((loggedByDate.get(label) ?? 0) / 60).toFixed(1)),
        })),
      };

      return { variant: "line", series: [estimateSeries, loggedSeries] };
    }
    case "active_projects_count": {
      const projects = await listProjects();
      const scopedCount = projectId ? projects.filter((project) => project.id === projectId).length : projects.length;
      return {
        variant: "counter",
        value: scopedCount,
        label: projectId ? `${options.projectName ?? "Project"} scope` : "Active projects",
      };
    }
    case "overdue_tasks_table": {
      const tasks = await getWorkloadTasks({ ...params, statusFilter: "open" });
      const today = normalizeDate(new Date().toISOString());
      const overdue = tasks.filter((task) => {
        const due = normalizeDate(task.due_date);
        if (!due || !today) return false;
        return due < today && !isClosedStatus(task.status);
      });
      overdue.sort((a, b) => {
        const dueA = normalizeDate(a.due_date);
        const dueB = normalizeDate(b.due_date);
        if (dueA && dueB) {
          return dueA.localeCompare(dueB);
        }
        if (dueA) return -1;
        if (dueB) return 1;
        return a.title.localeCompare(b.title);
      });
      const columns: TableWidgetColumn[] = [
        { key: "title", label: "Task" },
        { key: "assignee", label: "Assignee" },
        { key: "due", label: "Due" },
        { key: "estimate", label: "Est. (h)", align: "right" },
      ];
      const rows = overdue.map((task) => ({
        title: task.title,
        assignee: task.assignee_name ?? "Unassigned",
        due: task.due_date ? format(new Date(task.due_date), "MMM d") : "No due date",
        estimate: (Number(task.estimate_minutes ?? 0) / 60).toFixed(1),
      }));
      return {
        variant: "table",
        columns,
        rows,
        emptyMessage: "No overdue tasks",
      };
    }
    default: {
      const summary = await getWorkloadSummary({ ...params, includeTime: definition?.requiresTime });
      const value = summary.reduce((total, row) => total + row.open_tasks, 0);
      return { variant: "counter", value };
    }
  }
}

type WidgetDataOptions = {
  widget: DashboardWidget;
  fallbackProjectId?: string | null;
  projectName?: string | null;
};

function useWidgetData({ widget, fallbackProjectId, projectName }: WidgetDataOptions) {
  return useQuery<WidgetComputation>({
    queryKey: ["dashboard", "widget-data", widget.id, widget.updated_at, widget.config],
    queryFn: () =>
      loadWidgetData(
        {
          id: widget.id,
          type: widget.type,
          title: widget.title,
          config: widget.config as WidgetConfig,
        },
        { fallbackProjectId, projectName }
      ),
    staleTime: 1000 * 30,
  });
}

type WidgetPreviewOptions = {
  draft: WidgetDraft;
  fallbackProjectId?: string | null;
  projectName?: string | null;
  enabled?: boolean;
};

function useWidgetPreview({ draft, fallbackProjectId, projectName, enabled }: WidgetPreviewOptions) {
  return useQuery<WidgetComputation>({
    queryKey: ["dashboard", "widget-preview", draft.config, draft.type],
    queryFn: () => loadWidgetData(draft, { fallbackProjectId, projectName }),
    enabled,
    staleTime: 1000 * 15,
  });
}

type WidgetFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: { title: string; type: DashboardWidget["type"]; config: WidgetConfig }) => Promise<void>;
  initialWidget?: DashboardWidget | null;
  lockedProjectId?: string | null;
  projectOptions: ProjectSummary[];
};

function WidgetFormDialog({
  open,
  onOpenChange,
  onSubmit,
  initialWidget,
  lockedProjectId,
  projectOptions,
}: WidgetFormDialogProps) {
  const [templateId, setTemplateId] = useState<TemplateId>(
    initialWidget ? guessTemplateId(initialWidget) : "open_tasks_count"
  );
  const [title, setTitle] = useState(initialWidget?.title ?? getTemplateDefinition(templateId).defaultTitle);
  const [statusFilter, setStatusFilter] = useState<"open" | "all">(
    (initialWidget?.config as WidgetConfig | undefined)?.statusFilter ?? "open"
  );
  const [visualization, setVisualization] = useState<"bar" | "pie">(
    (initialWidget?.config as WidgetConfig | undefined)?.visualization ??
      getTemplateDefinition(templateId).defaultVisualization ?? "bar"
  );
  const [includeTime, setIncludeTime] = useState(
    (initialWidget?.config as WidgetConfig | undefined)?.includeTime ??
      getTemplateDefinition(templateId).requiresTime ?? false
  );
  const [dateFrom, setDateFrom] = useState<string | null>(
    (initialWidget?.config as WidgetConfig | undefined)?.dateFrom ?? null
  );
  const [dateTo, setDateTo] = useState<string | null>(
    (initialWidget?.config as WidgetConfig | undefined)?.dateTo ?? null
  );
  const [projectId, setProjectId] = useState<string | null>(
    (initialWidget?.config as WidgetConfig | undefined)?.projectId ?? lockedProjectId ?? null
  );

  useEffect(() => {
    const template = initialWidget ? guessTemplateId(initialWidget) : "open_tasks_count";
    const definition = getTemplateDefinition(template);
    const config = (initialWidget?.config as WidgetConfig | undefined) ?? {};
    setTemplateId(template);
    setTitle(initialWidget?.title ?? definition.defaultTitle);
    setStatusFilter(config.statusFilter ?? "open");
    setVisualization(config.visualization ?? definition.defaultVisualization ?? "bar");
    setIncludeTime(config.includeTime ?? definition.requiresTime ?? false);
    setDateFrom(config.dateFrom ?? null);
    setDateTo(config.dateTo ?? null);
    setProjectId(config.projectId ?? lockedProjectId ?? null);
  }, [open, initialWidget, lockedProjectId]);

  const selectedDefinition = getTemplateDefinition(templateId);

  const previewDraft: WidgetDraft = useMemo(
    () => ({
      id: initialWidget?.id ?? "preview",
      type: selectedDefinition.type,
      title,
      config: {
        template: templateId,
        projectId,
        dateFrom,
        dateTo,
        statusFilter,
        visualization,
        includeTime,
      },
    }),
    [initialWidget?.id, templateId, title, projectId, dateFrom, dateTo, statusFilter, visualization, includeTime, selectedDefinition.type]
  );

  const previewQuery = useWidgetPreview({
    draft: previewDraft,
    fallbackProjectId: lockedProjectId ?? null,
    projectName: projectOptions.find((project) => project.id === (projectId ?? lockedProjectId ?? ""))?.name ?? null,
    enabled: open,
  });

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await onSubmit({
      title: title.trim(),
      type: selectedDefinition.type,
      config: {
        template: templateId,
        projectId,
        dateFrom,
        dateTo,
        statusFilter,
        visualization,
        includeTime,
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{initialWidget ? "Edit widget" : "Add widget"}</DialogTitle>
          <DialogDescription>Configure the data and visualization for this widget.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="widget-title">Title</Label>
              <Input
                id="widget-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={selectedDefinition.defaultTitle}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="widget-template">Data source</Label>
              <Select
                value={templateId}
                onValueChange={(value) => {
                  const template = value as TemplateId;
                  const def = getTemplateDefinition(template);
                  setTemplateId(template);
                  setVisualization(def.defaultVisualization ?? "bar");
                  setIncludeTime(def.requiresTime ?? false);
                  setTitle((current) => (current.trim() ? current : def.defaultTitle));
                }}
              >
                <SelectTrigger id="widget-template">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TEMPLATE_DEFINITIONS.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {selectedDefinition.description}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as "open" | "all")}> 
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open only</SelectItem>
                  <SelectItem value="all">All statuses</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="widget-from">From</Label>
                <Input
                  id="widget-from"
                  type="date"
                  value={dateFrom ?? ""}
                  onChange={(event) => setDateFrom(event.target.value || null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="widget-to">To</Label>
                <Input
                  id="widget-to"
                  type="date"
                  value={dateTo ?? ""}
                  onChange={(event) => setDateTo(event.target.value || null)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Project scope</Label>
              <Select
                value={lockedProjectId ? lockedProjectId : projectId ?? "workspace"}
                onValueChange={(value) => {
                  if (lockedProjectId) return;
                  setProjectId(value === "workspace" ? null : value);
                }}
                disabled={Boolean(lockedProjectId)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="workspace">Workspace</SelectItem>
                  {projectOptions.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedDefinition.type === "pie" && (
              <div className="space-y-2">
                <Label>Visualization</Label>
                <Select value={visualization} onValueChange={(value) => setVisualization(value as "bar" | "pie")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pie">Pie</SelectItem>
                    <SelectItem value="bar">Bar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {selectedDefinition.requiresTime && (
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <div>
                  <Label className="text-sm font-medium">Include time entries</Label>
                  <p className="text-xs text-muted-foreground">Show logged minutes when available.</p>
                </div>
                <Switch checked={includeTime} onCheckedChange={setIncludeTime} />
              </div>
            )}
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Preview</h3>
            <div className="min-h-[240px] rounded-lg border bg-muted/20 p-4">
              {previewQuery.isLoading && <Skeleton className="h-40 w-full" />}
              {previewQuery.isError && (
                <p className="text-sm text-destructive">Unable to load preview right now.</p>
              )}
              {previewQuery.data && <WidgetVisualization widget={{ ...previewDraft, type: previewDraft.type }} data={previewQuery.data} />}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!title.trim()}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type WidgetVisualizationProps = {
  widget: WidgetDraft;
  data: WidgetComputation;
};

function WidgetVisualization({ widget, data }: WidgetVisualizationProps) {
  switch (data.variant) {
    case "counter":
      return <CounterWidget value={data.value} label={data.label} comparisonLabel={data.comparisonLabel} comparisonValue={data.comparisonValue} />;
    case "bar":
      return <BarChartWidget data={data.data} orientation={data.orientation} />;
    case "pie":
      return <PieChartWidget data={data.data} />;
    case "line":
      return <LineChartWidget series={data.series} />;
    case "table":
      return <TableWidget columns={data.columns} rows={data.rows} emptyMessage={data.emptyMessage} />;
    default:
      return null;
  }
}

type DashboardDetailViewProps = {
  projectIdFromRoute?: string;
};

export function DashboardDetailView({ projectIdFromRoute }: DashboardDetailViewProps) {
  const { dashboardId } = useParams<{ dashboardId: string }>();
  const navigate = useNavigate();
  if (!dashboardId) {
    return (
      <section className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Dashboard not found</AlertTitle>
          <AlertDescription>Return to the dashboards list and try again.</AlertDescription>
        </Alert>
        <Button
          variant="outline"
          onClick={() => navigate(projectIdFromRoute ? `/projects/${projectIdFromRoute}/dashboards` : "/dashboards")}
        >
          Back to dashboards
        </Button>
      </section>
    );
  }

  return (
    <DashboardDetailContent dashboardId={dashboardId} projectIdFromRoute={projectIdFromRoute} />
  );
}

type DashboardDetailContentProps = {
  dashboardId: string;
  projectIdFromRoute?: string;
};

function DashboardDetailContent({ dashboardId, projectIdFromRoute }: DashboardDetailContentProps) {
  const navigate = useNavigate();
  const dashboardQuery = useDashboard(dashboardId);
  const dashboard = dashboardQuery.data ?? null;
  const widgetsQuery = useDashboardWidgets(dashboardId);
  const widgets = useMemo(() => widgetsQuery.data ?? [], [widgetsQuery.data]);
  const widgetMutations = useDashboardWidgetMutations(dashboardId);
  const { updateDashboard, deleteDashboard } = useDashboardMutations();

  const projectsQuery = useQuery<ProjectSummary[]>({
    queryKey: ["projects", "options"],
    queryFn: listProjects,
    staleTime: 1000 * 60 * 10,
  });
  const projectLookup = useMemo(() => {
    return new Map((projectsQuery.data ?? []).map((project) => [project.id, project.name]));
  }, [projectsQuery.data]);

  const projectId = projectIdFromRoute ?? dashboard?.project_id ?? null;
  const projectQuery = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => (projectId ? getProject(projectId) : Promise.resolve(null)),
    enabled: Boolean(projectId),
    staleTime: 1000 * 60 * 5,
  });

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isWidgetDialogOpen, setWidgetDialogOpen] = useState(false);
  const [editingWidget, setEditingWidget] = useState<DashboardWidget | null>(null);

  useEffect(() => {
    if (dashboard?.name) {
      document.title = `${dashboard.name} • Dashboards`;
      setNameDraft(dashboard.name);
    }
  }, [dashboard?.name]);

  const orderedWidgets = useMemo(() => {
    const items = [...widgets];
    return items.sort((a, b) => {
      const orderA = typeof a.position?.order === "number" ? a.position.order : items.indexOf(a);
      const orderB = typeof b.position?.order === "number" ? b.position.order : items.indexOf(b);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.created_at.localeCompare(b.created_at);
    });
  }, [widgets]);

  const projectName = projectQuery.data?.name ?? null;

  const handleRename = async () => {
    if (!nameDraft.trim()) return;
    await updateDashboard({ id: dashboardId, patch: { name: nameDraft.trim() } });
    setIsEditingName(false);
  };

  const handleAddWidget = async (input: { title: string; type: DashboardWidget["type"]; config: WidgetConfig }) => {
    await widgetMutations.createWidget({
      type: input.type,
      title: input.title,
      config: { ...input.config },
      position: { order: widgets.length },
    });
  };

  const handleEditWidget = async (input: { title: string; type: DashboardWidget["type"]; config: WidgetConfig }) => {
    if (!editingWidget) return;
    await widgetMutations.updateWidget({
      id: editingWidget.id,
      patch: {
        title: input.title,
        config: { ...input.config },
      },
    });
    setEditingWidget(null);
  };

  const handleDuplicateWidget = async (widget: DashboardWidget) => {
    await widgetMutations.createWidget({
      type: widget.type,
      title: `${widget.title ?? "Widget"} copy`,
      config: widget.config,
      position: { order: widgets.length },
    });
  };

  const handleDeleteWidget = async (id: string) => {
    await widgetMutations.deleteWidget(id);
  };

  const reorderWidgets = async (id: string, direction: "up" | "down") => {
    const index = orderedWidgets.findIndex((widget) => widget.id === id);
    if (index === -1) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= orderedWidgets.length) {
      return;
    }
    const updated = [...orderedWidgets];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    await Promise.all(
      updated.map((widget, position) =>
        widgetMutations.updateWidget({
          id: widget.id,
          patch: { position: { ...(widget.position ?? {}), order: position } },
        })
      )
    );
  };

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Dashboards", href: projectIdFromRoute ? `/projects/${projectIdFromRoute}/dashboards` : "/dashboards" },
  ];
  if (projectName && projectIdFromRoute) {
    breadcrumbs.splice(1, 0, { label: "Projects", href: "/projects" });
    breadcrumbs.splice(2, 0, { label: projectName, href: `/projects/${projectIdFromRoute}` });
  }
  if (dashboard?.name) {
    breadcrumbs.push({ label: dashboard.name, href: "" });
  }

  if (dashboardQuery.isLoading) {
    return (
      <section className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-40" />
          ))}
        </div>
      </section>
    );
  }

  if (dashboardQuery.isError || !dashboard) {
    return (
      <section className="space-y-4">
        <Alert variant="destructive">
          <AlertTitle>Dashboard not found</AlertTitle>
          <AlertDescription>We could not load this dashboard. It may have been removed.</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={() => navigate(projectIdFromRoute ? `/projects/${projectIdFromRoute}/dashboards` : "/dashboards")}>
          Back to dashboards
        </Button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <div className="space-y-4">
        <Breadcrumb>
          <BreadcrumbList>
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem>
                  {index === breadcrumbs.length - 1 || !crumb.href ? (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>{crumb.label}</BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {index < breadcrumbs.length - 1 && <BreadcrumbSeparator />}
              </Fragment>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            {isEditingName ? (
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
                <Input value={nameDraft} onChange={(event) => setNameDraft(event.target.value)} className="md:w-72" />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleRename} disabled={!nameDraft.trim()}>
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setIsEditingName(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight">{dashboard.name}</h1>
                <Button variant="ghost" size="sm" onClick={() => setIsEditingName(true)}>
                  Rename
                </Button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span>Updated {format(new Date(dashboard.updated_at), "MMM d, yyyy")}</span>
              {projectName ? <Badge variant="outline">{projectName}</Badge> : <Badge variant="outline">Workspace</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={async () => {
                await deleteDashboard(dashboardId);
                navigate(projectIdFromRoute ? `/projects/${projectIdFromRoute}/dashboards` : "/dashboards");
              }}
            >
              Delete dashboard
            </Button>
            <Button onClick={() => {
              setEditingWidget(null);
              setWidgetDialogOpen(true);
            }}>
              Add widget
            </Button>
          </div>
        </div>
      </div>

      {widgetsQuery.isError && (
        <Alert variant="destructive">
          <AlertTitle>Unable to load widgets</AlertTitle>
          <AlertDescription>Refresh the page to try again.</AlertDescription>
        </Alert>
      )}

      {widgetsQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-52" />
          ))}
        </div>
      ) : orderedWidgets.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center gap-3 py-12 text-center">
            <h2 className="text-xl font-semibold">No widgets yet</h2>
            <p className="text-sm text-muted-foreground">Add your first widget to start building this dashboard.</p>
            <Button onClick={() => {
              setEditingWidget(null);
              setWidgetDialogOpen(true);
            }}>
              New widget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {orderedWidgets.map((widget, index) => (
            <WidgetCard
              key={widget.id}
              widget={widget}
              projectName={projectName}
              fallbackProjectId={projectId}
              projectLookup={projectLookup}
              onEdit={() => {
                setEditingWidget(widget);
                setWidgetDialogOpen(true);
              }}
              onDuplicate={() => handleDuplicateWidget(widget)}
              onDelete={() => handleDeleteWidget(widget.id)}
              onMoveUp={() => reorderWidgets(widget.id, "up")}
              onMoveDown={() => reorderWidgets(widget.id, "down")}
              isFirst={index === 0}
              isLast={index === orderedWidgets.length - 1}
            />
          ))}
        </div>
      )}

      <WidgetFormDialog
        open={isWidgetDialogOpen}
        onOpenChange={(open) => {
          setWidgetDialogOpen(open);
          if (!open) {
            setEditingWidget(null);
          }
        }}
        onSubmit={editingWidget ? handleEditWidget : handleAddWidget}
        initialWidget={editingWidget}
        lockedProjectId={projectIdFromRoute ?? dashboard.project_id ?? null}
        projectOptions={projectsQuery.data ?? []}
      />
    </section>
  );
}

type WidgetCardProps = {
  widget: DashboardWidget;
  projectName: string | null;
  fallbackProjectId: string | null;
  projectLookup: Map<string, string>;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
};

function WidgetCard({
  widget,
  projectName,
  fallbackProjectId,
  projectLookup,
  onEdit,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
}: WidgetCardProps) {
  const normalized = normalizeConfig(
    {
      id: widget.id,
      type: widget.type,
      config: widget.config as WidgetConfig,
      title: widget.title,
    },
    fallbackProjectId
  );
  const scopedProjectName = normalized.projectId
    ? projectLookup.get(normalized.projectId) ?? projectName ?? "Project"
    : projectName;
  const dataQuery = useWidgetData({
    widget,
    fallbackProjectId,
    projectName: scopedProjectName ?? null,
  });
  const subtitle = scopedProjectName ?? "Workspace";

  return (
    <WidgetFrame
      title={widget.title ?? getTemplateDefinition(guessTemplateId(widget)).defaultTitle}
      subtitle={subtitle}
      onEdit={onEdit}
      onDuplicate={onDuplicate}
      onDelete={onDelete}
      onMoveUp={!isFirst ? onMoveUp : undefined}
      onMoveDown={!isLast ? onMoveDown : undefined}
    >
      {dataQuery.isLoading && <Skeleton className="h-32 w-full" />}
      {dataQuery.isError && (
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Unable to load data for this widget.</p>
          <Button size="sm" variant="outline" onClick={() => dataQuery.refetch()}>
            Retry
          </Button>
        </div>
      )}
      {dataQuery.data && <WidgetVisualization widget={{ id: widget.id, type: widget.type, title: widget.title ?? undefined, config: widget.config as WidgetConfig }} data={dataQuery.data} />}
    </WidgetFrame>
  );
}
