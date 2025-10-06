import { supabase } from "@/integrations/supabase/client";
import { WorkloadRow } from "@/types";
import { formatISO, isAfter, isBefore, parseISO } from "date-fns";

export type WorkloadQueryParams = {
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
  includeTime?: boolean;
  statusFilter?: "open" | "all";
};

export type WorkloadTask = {
  id: string;
  title: string;
  status: string | null;
  due_date: string | null;
  created_at: string;
  estimate_minutes: number;
  assignee_id: string | null;
  assignee_name?: string | null;
  assignee_avatar_url?: string | null;
  project_id: string;
};

export const UNASSIGNED_KEY = "__unassigned__";

const CLOSED_STATUSES = new Set(["done", "archived", "completed", "cancelled", "resolved"]);

const DATE_REPRESENTATION: Parameters<typeof formatISO>[1] = { representation: "date" };

export type TimeEntryRecord = {
  id: string;
  task_id: string;
  user_id: string;
  minutes: number;
  entry_date: string | null;
  note?: string | null;
};

function normalizeDate(value?: string) {
  if (!value) return undefined;
  try {
    return formatISO(parseISO(value), DATE_REPRESENTATION);
  } catch (_error) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : formatISO(parsed, DATE_REPRESENTATION);
  }
}

function parseDate(value?: string | null) {
  if (!value) return null;
  try {
    const parsed = parseISO(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("invalid");
    }
    return parsed;
  } catch (_error) {
    const fallback = new Date(value);
    return Number.isNaN(fallback.getTime()) ? null : fallback;
  }
}

function isClosedStatus(status?: string | null) {
  if (!status) return false;
  return CLOSED_STATUSES.has(status.toLowerCase());
}

function isTaskInRange(
  task: Pick<WorkloadTask, "created_at" | "due_date">,
  dateFrom?: string,
  dateTo?: string
) {
  const start = parseDate(task.created_at);
  const end = parseDate(task.due_date) ?? start;
  const fromDate = dateFrom ? parseDate(dateFrom) : null;
  const toDate = dateTo ? parseDate(dateTo) : null;

  if (!fromDate && !toDate) return true;

  if (fromDate && end && isBefore(end, fromDate)) {
    return false;
  }

  if (toDate && start && isAfter(start, toDate)) {
    return false;
  }

  return true;
}

async function fetchTasks(params: WorkloadQueryParams): Promise<WorkloadTask[]> {
  const { projectId, dateFrom, dateTo, statusFilter = "open" } = params;

  let query = supabase
    .from("tasks")
    .select(
      `id, title, status, due_date, created_at, estimate_minutes, assignee_id, project_id,
       assignee_profile:profiles!tasks_assignee_id_fkey(full_name, avatar_url)`
    )
    .order("due_date", { ascending: true, nullsFirst: false });

  if (projectId) {
    query = query.eq("project_id", projectId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[workload] Failed to fetch tasks", error);
    return [];
  }

  const normalizedFrom = normalizeDate(dateFrom);
  const normalizedTo = normalizeDate(dateTo);

  return (
    data ?? []
  )
    .map((task: any) => {
      const taskRecord: WorkloadTask = {
        id: task.id,
        title: task.title ?? "Untitled task",
        status: task.status ?? null,
        due_date: task.due_date ?? null,
        created_at: task.created_at ?? new Date().toISOString(),
        estimate_minutes: Number(task.estimate_minutes ?? 0) || 0,
        assignee_id: task.assignee_id ?? null,
        assignee_name: task.assignee_profile?.full_name ?? null,
        assignee_avatar_url: task.assignee_profile?.avatar_url ?? null,
        project_id: task.project_id,
      };

      return taskRecord;
    })
    .filter((task) => {
      if (!isTaskInRange(task, normalizedFrom, normalizedTo)) {
        return false;
      }

      if (statusFilter === "open") {
        return !isClosedStatus(task.status);
      }

      return true;
    });
}

export async function getTimeEntriesByTasks(
  taskIds: string[],
  params: WorkloadQueryParams
): Promise<Map<string, { minutes: number; name?: string | null; entry_date?: string | null }>> {
  if (!params.includeTime || taskIds.length === 0) {
    return new Map();
  }

  let query = supabase
    .from("time_entries")
    .select(
      `id, minutes, entry_date, user_id,
       profiles:user_id(full_name)`
    )
    .in("task_id", taskIds);

  const normalizedFrom = normalizeDate(params.dateFrom);
  const normalizedTo = normalizeDate(params.dateTo);

  if (normalizedFrom) {
    query = query.gte("entry_date", normalizedFrom);
  }

  if (normalizedTo) {
    query = query.lte("entry_date", normalizedTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[workload] Failed to fetch time entries", error);
    return new Map();
  }

  const aggregated = new Map<string, { minutes: number; name?: string | null; entry_date?: string | null }>();

  (data ?? []).forEach((entry: any) => {
    const userId: string = entry.user_id;
    if (!userId) {
      return;
    }

    const existing = aggregated.get(userId) ?? {
      minutes: 0,
      name: entry.profiles?.full_name ?? null,
      entry_date: entry.entry_date ?? null,
    };
    existing.minutes += Number(entry.minutes ?? 0) || 0;
    if (!existing.name && entry.profiles?.full_name) {
      existing.name = entry.profiles.full_name;
    }
    aggregated.set(userId, existing);
  });

  return aggregated;
}

export async function getDetailedTimeEntries(
  taskIds: string[],
  params: WorkloadQueryParams
): Promise<TimeEntryRecord[]> {
  if (taskIds.length === 0) {
    return [];
  }

  let query = supabase
    .from("time_entries")
    .select("id, task_id, user_id, minutes, entry_date, note")
    .in("task_id", taskIds);

  const normalizedFrom = normalizeDate(params.dateFrom);
  const normalizedTo = normalizeDate(params.dateTo);

  if (normalizedFrom) {
    query = query.gte("entry_date", normalizedFrom);
  }

  if (normalizedTo) {
    query = query.lte("entry_date", normalizedTo);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[workload] Failed to fetch detailed time entries", error);
    return [];
  }

  return (data as TimeEntryRecord[]) ?? [];
}

export async function getWorkloadSummary(params: WorkloadQueryParams): Promise<WorkloadRow[]> {
  const tasks = await fetchTasks(params);
  const rows = new Map<string, WorkloadRow>();

  const today = normalizeDate(new Date().toISOString());

  tasks.forEach((task) => {
    const key = task.assignee_id ?? UNASSIGNED_KEY;
    const existing = rows.get(key) ?? {
      assignee: task.assignee_id ?? null,
      assignee_name: task.assignee_name ?? (task.assignee_id ? null : "Unassigned"),
      open_tasks: 0,
      overdue_tasks: 0,
      estimate_minutes_total: 0,
      logged_minutes_total: undefined,
    };

    if (!existing.assignee_name && task.assignee_name) {
      existing.assignee_name = task.assignee_name;
    }

    const isOpen = !isClosedStatus(task.status);
    if (isOpen) {
      existing.open_tasks += 1;
      existing.estimate_minutes_total += task.estimate_minutes;
      const dueDate = normalizeDate(task.due_date ?? undefined);
      if (dueDate && today && dueDate < today) {
        existing.overdue_tasks += 1;
      }
    }

    rows.set(key, existing);
  });

  if (params.includeTime) {
    const timeEntries = await getTimeEntriesByTasks(
      tasks.map((task) => task.id),
      params
    );

    timeEntries.forEach((value, userId) => {
      const key = userId ?? UNASSIGNED_KEY;
      const existing = rows.get(key) ?? {
        assignee: userId ?? null,
        assignee_name: value.name ?? (userId ? null : "Unassigned"),
        open_tasks: 0,
        overdue_tasks: 0,
        estimate_minutes_total: 0,
        logged_minutes_total: 0,
      };

      if (!existing.assignee_name && value.name) {
        existing.assignee_name = value.name;
      }

      existing.logged_minutes_total = (existing.logged_minutes_total ?? 0) + value.minutes;

      rows.set(key, existing);
    });
  }

  return Array.from(rows.values()).sort((a, b) => {
    if (b.open_tasks !== a.open_tasks) {
      return b.open_tasks - a.open_tasks;
    }

    return b.estimate_minutes_total - a.estimate_minutes_total;
  });
}

export async function getWorkloadTasks(params: WorkloadQueryParams): Promise<WorkloadTask[]> {
  const tasks = await fetchTasks(params);

  return tasks.sort((a, b) => {
    const dueA = parseDate(a.due_date);
    const dueB = parseDate(b.due_date);

    if (dueA && dueB) {
      return dueA.getTime() - dueB.getTime();
    }

    if (dueA) return -1;
    if (dueB) return 1;

    return a.title.localeCompare(b.title);
  });
}
