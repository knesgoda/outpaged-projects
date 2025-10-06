import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  UNASSIGNED_KEY,
  WorkloadQueryParams,
  WorkloadTask,
  getWorkloadSummary,
  getWorkloadTasks,
} from "@/services/workload";
import type { WorkloadRow } from "@/types";

export type WorkloadAssigneeMap = Map<string, WorkloadTask[]>;

export function useWorkload(params: WorkloadQueryParams) {
  const summaryQuery = useQuery<WorkloadRow[]>({
    queryKey: ["workload", "summary", params],
    queryFn: () => getWorkloadSummary(params),
    staleTime: 1000 * 60 * 2,
  });

  const tasksQuery = useQuery<WorkloadTask[]>({
    queryKey: ["workload", "tasks", params],
    queryFn: () => getWorkloadTasks(params),
    staleTime: 1000 * 60 * 2,
  });

  const tasksByAssignee = useMemo<WorkloadAssigneeMap>(() => {
    const map: WorkloadAssigneeMap = new Map();
    (tasksQuery.data ?? []).forEach((task) => {
      const key = task.assignee_id ?? UNASSIGNED_KEY;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key)!.push(task);
    });

    map.forEach((tasks) => {
      tasks.sort((a, b) => {
        const dueADate = a.due_date ? new Date(a.due_date) : null;
        const dueBDate = b.due_date ? new Date(b.due_date) : null;
        const dueA = dueADate && !Number.isNaN(dueADate.getTime()) ? dueADate.getTime() : Infinity;
        const dueB = dueBDate && !Number.isNaN(dueBDate.getTime()) ? dueBDate.getTime() : Infinity;
        if (dueA !== dueB) {
          return dueA - dueB;
        }
        return a.title.localeCompare(b.title);
      });
    });

    return map;
  }, [tasksQuery.data]);

  const hasEstimates = useMemo(() => {
    return (tasksQuery.data ?? []).some((task) => (task.estimate_minutes ?? 0) > 0);
  }, [tasksQuery.data]);

  const isLoading = summaryQuery.isLoading || tasksQuery.isLoading;
  const isError = summaryQuery.isError || tasksQuery.isError;

  return {
    summary: summaryQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    tasksByAssignee,
    hasEstimates,
    isLoading,
    isError,
    refetch: () => Promise.all([summaryQuery.refetch(), tasksQuery.refetch()]),
  };
}
