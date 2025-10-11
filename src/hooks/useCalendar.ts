import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type CalendarRange = {
  from: Date;
  to: Date;
  projectId?: string;
  calendarIds?: string[];
};

export type CalendarTask = {
  id: string;
  project_id: string;
  calendar_id?: string | null;
  title: string;
  status?: string | null;
  assignee?: string | null;
  start_date?: string | null;
  due_date?: string | null;
  updated_at: string;
};

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

const MOCK_TASKS: CalendarTask[] = [
  {
    id: "task-1",
    project_id: "apollo",
    calendar_id: "calendar.project.apollo",
    title: "Sprint review",
    status: "confirmed",
    assignee: "Avery",
    start_date: "2024-07-17T14:00:00.000Z",
    due_date: "2024-07-17T15:00:00.000Z",
    updated_at: "2024-07-01T12:00:00.000Z",
  },
  {
    id: "task-2",
    project_id: "apollo",
    calendar_id: "calendar.project.apollo",
    title: "Milestone: API freeze",
    status: "milestone",
    start_date: "2024-07-19T00:00:00.000Z",
    due_date: "2024-07-19T23:59:59.000Z",
    updated_at: "2024-07-01T10:00:00.000Z",
  },
  {
    id: "task-3",
    project_id: "workspace",
    calendar_id: "calendar.workspace",
    title: "Company All-Hands",
    status: "confirmed",
    assignee: "Ops",
    start_date: "2024-07-18T16:00:00.000Z",
    due_date: "2024-07-18T17:00:00.000Z",
    updated_at: "2024-06-28T09:00:00.000Z",
  },
  {
    id: "task-4",
    project_id: "personal",
    calendar_id: "calendar.personal",
    title: "Focus block",
    status: "busy",
    start_date: "2024-07-17T13:00:00.000Z",
    due_date: "2024-07-17T14:00:00.000Z",
    updated_at: "2024-07-02T08:00:00.000Z",
  },
  {
    id: "task-5",
    project_id: "team",
    calendar_id: "calendar.team.engineering",
    title: "Engineering Sync",
    status: "confirmed",
    start_date: "2024-07-16T18:00:00.000Z",
    due_date: "2024-07-16T19:00:00.000Z",
    updated_at: "2024-07-02T08:00:00.000Z",
  },
  {
    id: "task-6",
    project_id: "external",
    calendar_id: "calendar.external.google",
    title: "External workshop",
    status: "tentative",
    start_date: "2024-07-20T14:00:00.000Z",
    due_date: "2024-07-20T16:00:00.000Z",
    updated_at: "2024-07-03T10:00:00.000Z",
  },
];

function parseDate(value?: string | null) {
  if (!value) return null;
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function overlapsRange(task: CalendarTask, from: Date, to: Date) {
  const start = parseDate(task.start_date) ?? parseDate(task.due_date);
  const end = parseDate(task.due_date) ?? parseDate(task.start_date);
  if (!start || !end) {
    return false;
  }
  return start <= to && end >= from;
}

export function useCalendarRange(range: CalendarRange) {
  const { from, to, projectId, calendarIds } = range;
  const key = useMemo(
    () => ["calendar", projectId ?? "all", toIsoDate(from), toIsoDate(to), ...(calendarIds ?? [])],
    [from, to, projectId, calendarIds]
  );

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      await new Promise((resolve) => setTimeout(resolve, 90));
      return MOCK_TASKS.filter((task) => {
        if (projectId && task.project_id !== projectId) {
          return false;
        }
        if (calendarIds && calendarIds.length > 0 && task.calendar_id) {
          return calendarIds.includes(task.calendar_id) && overlapsRange(task, from, to);
        }
        return overlapsRange(task, from, to);
      });
    },
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
