import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

type CalendarRange = {
  from: Date;
  to: Date;
  projectId?: string;
};

export type CalendarTask = {
  id: string;
  project_id: string;
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

export function useCalendarRange(range: CalendarRange) {
  const { from, to, projectId } = range;
  const key = useMemo(
    () => ["calendar", projectId ?? "all", toIsoDate(from), toIsoDate(to)],
    [from, to, projectId]
  );

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      // Placeholder implementation until services are wired.
      return [] as CalendarTask[];
    },
  });

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
