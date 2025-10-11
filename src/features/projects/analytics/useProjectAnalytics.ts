import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInDays } from "date-fns";
import { tasksWithDetails } from "@/services/tasksService";
import type { TaskWithDetails } from "@/types/tasks";
import {
  getNotificationDigestSummary,
  getNotificationDeliveryLog,
  registerDueSoonNotifications,
  processNotificationQueue,
  type NotificationDigestSummary,
  type NotificationDeliveryRecord,
} from "@/services/projects/projectNotificationService";
import { evaluateProjectSLA, type SLAHealthSnapshot } from "@/services/projects/projectSLAService";

export interface WorkloadSummary {
  assigneeId: string;
  assigneeName: string;
  openTasks: number;
  urgent: number;
  estimatedHours: number;
}

export interface RiskItem {
  taskId: string;
  title: string;
  reason: string;
  severity: "high" | "medium" | "low";
  dueDate?: string | null;
  assignees: string[];
}

export interface CustomFieldInsight {
  field: string;
  topValues: Array<{ value: string; count: number }>;
}

export interface LineageInsight {
  taskId: string;
  title: string;
  dependencies: number;
  dependents: number;
}

export interface ProjectAnalyticsSummary {
  generatedAt: string;
  tasks: TaskWithDetails[];
  openTasks: number;
  completedLast7Days: number;
  createdLast7Days: number;
  dueSoon: TaskWithDetails[];
  overdue: TaskWithDetails[];
  statusBreakdown: Array<{ status: string; value: number }>;
  priorityBreakdown: Array<{ priority: string; value: number }>;
  workload: WorkloadSummary[];
  risks: RiskItem[];
  customFieldInsights: CustomFieldInsight[];
  lineage: LineageInsight[];
  digestSummary: NotificationDigestSummary;
  deliveryLog: NotificationDeliveryRecord[];
  sla: SLAHealthSnapshot;
}

export function useProjectAnalytics(projectId: string) {
  const {
    data: tasks = [],
    isLoading,
    refetch,
  } = useQuery<TaskWithDetails[]>({
    queryKey: ["project-analytics", projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      if (!projectId) return [];
      return tasksWithDetails(projectId);
    },
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (!projectId || tasks.length === 0) return;
    registerDueSoonNotifications(projectId, tasks);
    processNotificationQueue(projectId);
  }, [projectId, tasks]);

  const analytics = useMemo(() => buildProjectAnalytics(projectId, tasks), [projectId, tasks]);

  return {
    tasks,
    analytics,
    isLoading,
    refetch,
  };
}

export function buildProjectAnalytics(
  projectId: string,
  tasks: TaskWithDetails[],
  generatedAt = new Date(),
): ProjectAnalyticsSummary {
  const openTasks = tasks.filter((task) => task.status !== "done").length;
  const completedLast7Days = tasks.filter((task) =>
    task.completed_at && differenceInDays(generatedAt, new Date(task.completed_at)) <= 7,
  ).length;
  const createdLast7Days = tasks.filter((task) =>
    task.created_at && differenceInDays(generatedAt, new Date(task.created_at)) <= 7,
  ).length;

  const dueSoon = tasks
    .filter((task) => {
      if (!task.due_date || task.completed_at) return false;
      const dueDate = new Date(task.due_date);
      return dueDate >= generatedAt && dueDate <= addDays(generatedAt, 7);
    })
    .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime());

  const overdue = tasks
    .filter((task) => {
      if (!task.due_date || task.completed_at) return false;
      return new Date(task.due_date) < generatedAt;
    })
    .sort((a, b) => new Date(a.due_date ?? 0).getTime() - new Date(b.due_date ?? 0).getTime());

  const statusBreakdownMap = new Map<string, number>();
  const priorityBreakdownMap = new Map<string, number>();
  const workloadMap = new Map<string, WorkloadSummary>();
  const riskItems: RiskItem[] = [];
  const customFieldMap = new Map<string, Map<string, number>>();
  const lineage: LineageInsight[] = [];

  for (const task of tasks) {
    statusBreakdownMap.set(task.status, (statusBreakdownMap.get(task.status) ?? 0) + 1);
    priorityBreakdownMap.set(task.priority, (priorityBreakdownMap.get(task.priority) ?? 0) + 1);

    const assigneeNames = task.assignees?.map((assignee) => assignee.name) ?? [];
    if (task.assignees && task.assignees.length > 0) {
      for (const assignee of task.assignees) {
        if (!workloadMap.has(assignee.id)) {
          workloadMap.set(assignee.id, {
            assigneeId: assignee.id,
            assigneeName: assignee.name,
            openTasks: 0,
            urgent: 0,
            estimatedHours: 0,
          });
        }
        const summary = workloadMap.get(assignee.id)!;
        if (task.status !== "done") {
          summary.openTasks += 1;
        }
        if (task.priority === "urgent" || task.priority === "high") {
          summary.urgent += 1;
        }
        summary.estimatedHours += task.estimated_hours ?? 0;
      }
    }

    const riskReasons: string[] = [];
    if (task.blocked) {
      riskReasons.push("Blocked");
    }
    if (!task.due_date && task.priority === "urgent") {
      riskReasons.push("Urgent without due date");
    }
    if (task.due_date && new Date(task.due_date) < generatedAt && !task.completed_at) {
      riskReasons.push("Overdue");
    }
    if (task.due_date && differenceInDays(new Date(task.due_date), generatedAt) <= 2 && task.priority === "high") {
      riskReasons.push("High priority nearing due date");
    }
    if (riskReasons.length > 0) {
      riskItems.push({
        taskId: task.id,
        title: task.title ?? "Untitled task",
        reason: riskReasons.join(", "),
        severity: riskReasons.some((reason) => reason.includes("Urgent") || reason.includes("Overdue"))
          ? "high"
          : riskReasons.length > 1
            ? "medium"
            : "low",
        dueDate: task.due_date,
        assignees: assigneeNames,
      });
    }

    if (task.customFields) {
      for (const [field, value] of Object.entries(task.customFields)) {
        if (value === undefined || value === null) continue;
        if (!customFieldMap.has(field)) {
          customFieldMap.set(field, new Map());
        }
        const fieldMap = customFieldMap.get(field)!;
        const key = typeof value === "string"
          ? value
          : Array.isArray(value)
            ? value.join(", ")
            : String(value);
        fieldMap.set(key, (fieldMap.get(key) ?? 0) + 1);
      }
    }

    if (task.relations && task.relations.length > 0) {
      const dependencies = task.relations.filter((relation) => relation.direction === "incoming").length;
      const dependents = task.relations.filter((relation) => relation.direction === "outgoing").length;
      if (dependencies > 0 || dependents > 0) {
        lineage.push({
          taskId: task.id,
          title: task.title ?? "Untitled task",
          dependencies,
          dependents,
        });
      }
    }
  }

  const statusBreakdown = Array.from(statusBreakdownMap.entries()).map(([status, value]) => ({
    status,
    value,
  }));

  const priorityBreakdown = Array.from(priorityBreakdownMap.entries()).map(([priority, value]) => ({
    priority,
    value,
  }));

  const workload = Array.from(workloadMap.values()).sort((a, b) => b.openTasks - a.openTasks);

  const customFieldInsights: CustomFieldInsight[] = Array.from(customFieldMap.entries())
    .map(([field, valueMap]) => ({
      field,
      topValues: Array.from(valueMap.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([value, count]) => ({ value, count })),
    }))
    .slice(0, 5);

  const digestSummary = getNotificationDigestSummary(projectId);
  const deliveryLog = getNotificationDeliveryLog(projectId, 15);

  const sla = evaluateProjectSLA(projectId, tasks, generatedAt);

  return {
    generatedAt: generatedAt.toISOString(),
    tasks,
    openTasks,
    completedLast7Days,
    createdLast7Days,
    dueSoon,
    overdue,
    statusBreakdown,
    priorityBreakdown,
    workload,
    risks: riskItems.sort((a, b) => (a.severity === "high" ? -1 : 1)),
    customFieldInsights,
    lineage,
    digestSummary,
    deliveryLog,
    sla,
  } satisfies ProjectAnalyticsSummary;
}
